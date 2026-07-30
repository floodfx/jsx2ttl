import generate from '@babel/generator';
import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import {
  arrayExpression,
  callExpression,
  identifier,
  importDeclaration,
  importDefaultSpecifier,
  importSpecifier,
  memberExpression,
  newExpression,
  nullLiteral,
  objectExpression,
  objectProperty,
  spreadElement,
  stringLiteral,
  taggedTemplateExpression,
  templateElement,
  templateLiteral,
  type Expression,
  type Identifier,
  type JSXAttribute,
  type JSXElement,
  type JSXEmptyExpression,
  type JSXFragment,
  type JSXIdentifier,
  type JSXMemberExpression,
  type JSXNamespacedName,
  type JSXSpreadAttribute,
  type Node,
  type ObjectExpression,
  type SpreadElement
} from '@babel/types';

export type JSX2TTLMode = 'constructor' | 'function' | 'taggedTemplate';

export interface JSX2TTLOptions {
  /**
   * templateLibDir the relative or absolute path to the `Template` library
   * e.g. `import { Template } from 'ttl'` => `importPath: 'ttl'`
   * e.g. `import { Foo } from '../local/dir'` => `importPath: '../local/dir'`
   */
  importPath: string;

  /**
   * importName the name of the import, e.g. `import { Template }` => `importName: 'Template'`
   */
  importName: string;

  /**
   * importAs overrides the name of the import, e.g. `import { Template as MyTemplate }` => `importAs: 'MyTemplate'`
   * default: undefined
   */
  importAs?: string;

  /**
   * isDefault sets whether to use default imports or named 
   * e.g. default import: `import Template` => `isDefaultImport: true '`
   * e.g. named import: `import { Template }` => `isDefaultImport: false`
   * default: false
   */
  isDefaultImport?: boolean;

  /**
   * When true, the imported object is called as a function without `new` (e.g. `Foo()` instead of `new Foo()`)
   * default: false
   */
  callWithoutNew?: boolean;

  /**
   * Mode of output AST generation:
   * - 'constructor': new Template(statics, dynamics)
   * - 'function': html(statics, dynamics)
   * - 'taggedTemplate': html`<div ...>...</div>`
   * default: 'constructor' (or 'function' if callWithoutNew is true)
   */
  mode?: JSX2TTLMode;

  /**
   * Use parentMetadata to determine if tagged template literal (TTL) call should have additional arguments
   * beyond the statics and dynamics arrays.  This is useful when your TTL function or class constructor
   * takes additional arguments beyond the statics and dynamics arrays.  
   * @param parentMetadata metadata about the parent of the JSXElement
   * @returns array of additional arguments to pass to the TTL function or class constructor
   */
  callWithAdditionalArgsFn?: (parentMetadata: JSXElementParentMetadata) => (SpreadElement | Expression)[];

  /**
   * Enable custom transformation of JSX attributes to an ObjectExpression.  For example, you might want to
   * transform `className` to `class` or process the `style` attribute values.  
   * @param attribute the JSXAttribute or JSXSpreadAttribute to transform
   * @returns the transformed (or not) JSXAttribute or JSXSpreadAttribute
   */
  transformAttribute?: (attribute: JSXAttribute) => JSXAttribute;
}

export type JSXElementParentMetadata = 
{
  type: 'function'
  name: string
  isArrowFunction: boolean
} | {
  type: 'class'
  name: string
  interfaces: string[]
  superClasses: string[]
} | {
  type: 'unknown'
}

/**
 * jsx2ttl converts JSX code to TTL code.  
 * Specifically, it converts JSX code to a `Template` class or tagged template literal from the `ttl` library.
 * 
 * @param jsxCode JSX or TSX code that you want to convert to TTL
 * @param options configuration options
 * @returns new code that uses the `Template` class or tagged template literal from the `ttl` library
 */
export function jsx2ttl(jsxCode: string, options: JSX2TTLOptions) {
  const reqOpt: Required<JSX2TTLOptions> = {
    importPath: options.importPath,
    importName: options.importName,
    importAs: options.importAs ?? options.importName,
    isDefaultImport: options.isDefaultImport ?? false,
    callWithoutNew: options.callWithoutNew ?? false,
    mode: options.mode ?? (options.callWithoutNew ? 'function' : 'constructor'),
    callWithAdditionalArgsFn: options.callWithAdditionalArgsFn ?? (() => []),
    transformAttribute: options.transformAttribute ?? ((attr) => attr)
  };

  // parse the code into an AST
  const ast = parser.parse(jsxCode, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  // create a new ImportDeclaration for the Template class or tag function
  const importSpec = reqOpt.isDefaultImport ? importDefaultSpecifier(identifier(reqOpt.importAs)) : importSpecifier(identifier(reqOpt.importName), identifier(reqOpt.importAs));
  const newImport = importDeclaration(
    [importSpec], 
    stringLiteral(reqOpt.importPath) // source of the import
  );
  // update the AST to include the new import statement
  ast.program.body.unshift(newImport);
  
  // now traverse the AST and process JSXElements and JSXFragments
  traverse(ast as any, {
    JSXElement: {
      exit(path: NodePath<JSXElement> | any) {
        try {
          const parentMetadata = getParentMetadata(path);
          const newNode = processJSXElement(path.node, reqOpt, parentMetadata);
          path.replaceWith(newNode as any);
        } catch(e) {
          logErrorAndThrow(path.node, jsxCode, e);
        } 
      },
    },
    JSXFragment: {
      exit(path: NodePath<JSXFragment> | any) {
        try {
          const parentMetadata = getParentMetadata(path);
          const newNode = processJSXFragment(path.node, reqOpt, parentMetadata);
          path.replaceWith(newNode as any);
        } catch(e) {
          logErrorAndThrow(path.node, jsxCode, e);
        }
      }
    }
  });

  // use the modified ast to generate new code
  const { code: newCode } = generate(ast as any);
  return newCode;
}

function logErrorAndThrow(node: Node, jsxCode: string, e: any) {
  var loc = node.loc;
  var nodeText = jsxCode.substring(loc?.start.index ?? 0, loc?.end.index);          
  if(e instanceof Jsx2TtlError) {
    loc = e.node.loc;
    nodeText = jsxCode.substring(loc?.start.index ?? 0, loc?.end.index);            
  } else {
    console.warn(`Error thrown is not Jsx2TtlError so can only provide node location for debug info`, e);
  }     
  console.error(`Error processing JSX at ${loc?.start.line}:${loc?.start.column}-${loc?.end.line}:${loc?.end.column}\n\t${nodeText}\n\t`);
  throw e;
}

function getParentMetadata(path: any): JSXElementParentMetadata {
  let parentMetadata: JSXElementParentMetadata = { type: 'unknown' };
  let parentPath: any = path.parentPath;
  var maxDepth = 100;
  while (parentPath && maxDepth-- > 0) {
    if (parentPath.isFunctionDeclaration() || parentPath.isFunctionExpression()) {
      parentMetadata = {
        type: 'function',
        name: parentPath.node.id?.name ?? '',
        isArrowFunction: false
      };
      break;
    } else if (parentPath.isArrowFunctionExpression()) {
      parentMetadata = {
        type: 'function',
        name: (parentPath.parentPath.node as any)?.id?.name ?? '',
        isArrowFunction: true
      };
      break;
    } else if (parentPath.isClassDeclaration() || parentPath.isClassExpression()) {
      const className = parentPath.node.id?.name ?? '';
      const superClassExp = parentPath.node.superClass;
      var superClasses: string[] = [];
      if (superClassExp) {
        switch(superClassExp.type) {
          case 'Identifier':
            superClasses.push(superClassExp.name);
            break;
          case 'ArrayExpression':
            superClasses = superClassExp.elements.map((e: any) => (e as Identifier).name);
            break;
        }
      }

      const implementedInterfaces = parentPath.node.implements;   
      var interfaceNames: string[] = [];         
      if (implementedInterfaces && implementedInterfaces.length > 0) {                
        interfaceNames = implementedInterfaces.map((i: any) => {
          switch(i.type) {
            case 'ClassImplements':
              return i.id.name;
            case 'TSExpressionWithTypeArguments':
              return (i.expression as Identifier).name;
          }
        });
      }

      parentMetadata = {
        type: 'class',
        name: className,
        interfaces: interfaceNames,
        superClasses: superClasses
      };
      break;
    } 
    parentPath = parentPath.parentPath;
  }
  return parentMetadata;
}

/**
 * Process a JSXElement node and return a new AST node.
 */
function processJSXElement(element: JSXElement, options: Required<JSX2TTLOptions>, parentMetadata: JSXElementParentMetadata): Node {
  const tagName = getTagName(element.openingElement.name);

  // component is a tag that starts with an uppercase letter like `<Foo />` or `<Form.Input />`
  if (isComponent(tagName)) {
    const props = getProps(element.openingElement.attributes, element.children, options, parentMetadata);
    const tagExp = parseTagNameToExpression(tagName);

    if(parentMetadata.type === 'class') {
      const newExp = newExpression(tagExp, [props]);
      const callExp = callExpression(memberExpression(newExp, identifier('render')), []);
      return callExp;
    } else {
      const callExp = callExpression(tagExp, [props]);
      return callExp;
    }
  }

  let statics: string[] = [];
  let dynamics: Expression[] = [];

  // HTML tag initialization
  statics.push(`<${tagName}`);
  element.openingElement.attributes.forEach(attr => {
    if (attr.type === 'JSXAttribute') {
      const newAttr = options.transformAttribute(attr);
      const name = typeof newAttr.name.name === 'string' ? newAttr.name.name : newAttr.name.name.name;
      
      if (newAttr.value === null || newAttr.value === undefined) {
        // Boolean shorthand attribute, e.g. <input disabled />
        statics[statics.length - 1] += ` ${name}`;
        return;
      }      
      switch (newAttr.value.type) {
        case 'StringLiteral':
          statics[statics.length - 1] += ` ${name}="${newAttr.value.value}"`;
          break;        
        case 'JSXExpressionContainer':
          if (newAttr.value.expression.type === 'JSXEmptyExpression') {
            // empty expression
          } else {
            statics[statics.length - 1] += ` ${name}="`;
            dynamics.push(newAttr.value.expression);
            statics.push(`"`);
          }
          break;
        default:
          throw new Jsx2TtlError(`Unhandled JSXAttribute value type: ${(newAttr.value as any).type}`, attr);
      }
    } else if (attr.type === 'JSXSpreadAttribute') {
      statics[statics.length - 1] += ' ';
      dynamics.push(attr.argument);
      statics.push('');
    }
  });

  // close opening tag
  if (element.children.length === 0 && !element.closingElement) {
    statics[statics.length - 1] += ' />';
  } else {
    statics[statics.length - 1] += '>';
  }

  // process children
  processChildrenNodes(element.children, statics, dynamics);

  // close tag
  if (element.closingElement) {
    statics[statics.length - 1] += `</${tagName}>`;
  }

  // verify invariant: statics.length === dynamics.length + 1
  if(statics.length !== dynamics.length + 1) {
    throw new Jsx2TtlError(`Statics should have one more items than dynamics: statics.length=${statics.length}, dynamics.length=${dynamics.length}.`, element);
  }

  return createTTLNode(statics, dynamics, options, parentMetadata);
}

/**
 * Process a JSXFragment node and return a new TTL node.
 */
function processJSXFragment(fragment: JSXFragment, options: Required<JSX2TTLOptions>, parentMetadata: JSXElementParentMetadata): Node {
  let statics: string[] = [""];
  let dynamics: Expression[] = [];

  processChildrenNodes(fragment.children, statics, dynamics);

  if(statics.length !== dynamics.length + 1) {
    throw new Jsx2TtlError(`Statics should have one more items than dynamics in JSXFragment: statics.length=${statics.length}, dynamics.length=${dynamics.length}.`, fragment);
  }

  return createTTLNode(statics, dynamics, options, parentMetadata);
}

function processChildrenNodes(children: any[], statics: string[], dynamics: Expression[]) {
  children.forEach(child => {
    if (child.type === 'JSXText') {
      statics[statics.length - 1] += child.value;
    } else if (child.type === 'JSXExpressionContainer') {
      if (child.expression.type !== 'JSXEmptyExpression') {
        dynamics.push(child.expression);
        statics.push('');
      }
    } else if (
      child.type === 'NewExpression' ||
      child.type === 'CallExpression' ||
      child.type === 'TaggedTemplateExpression' ||
      child.type === 'Identifier' ||
      child.type === 'MemberExpression'
    ) {
      dynamics.push(child);
      statics.push('');
    } else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      throw new Jsx2TtlError(`Unexpected unprocessed child JSX node: ${child.type}`, child);
    }
  });
}

function createTTLNode(statics: string[], dynamics: Expression[], options: Required<JSX2TTLOptions>, parentMetadata: JSXElementParentMetadata): Expression {
  const additionalArgs = options.callWithAdditionalArgsFn(parentMetadata);

  if (options.mode === 'taggedTemplate') {
    const quasis = statics.map((s, i) => {
      const escaped = s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
      return templateElement({ raw: escaped, cooked: s }, i === statics.length - 1);
    });
    return taggedTemplateExpression(
      identifier(options.importAs),
      templateLiteral(quasis, dynamics)
    );
  } else if (options.mode === 'function') {
    return callExpression(identifier(options.importAs), [
      arrayExpression(statics.map(stringLiteral)),
      arrayExpression(dynamics),
      ...additionalArgs
    ]);
  } else {
    return newExpression(identifier(options.importAs), [
      arrayExpression(statics.map(stringLiteral)),
      arrayExpression(dynamics),
      ...additionalArgs
    ]);
  }
}

function parseTagNameToExpression(tagName: string): Expression {
  const parts = tagName.split('.');
  let exp: Expression = identifier(parts[0]);
  for (let i = 1; i < parts.length; i++) {
    exp = memberExpression(exp, identifier(parts[i]));
  }
  return exp;
}

/**
 * Handle JSX attributes and return an ObjectExpression for props, including children if present.
 */
function getProps(
  attributes: Array<JSXAttribute | JSXSpreadAttribute>,
  children: any[],
  options: Required<JSX2TTLOptions>,
  parentMetadata: JSXElementParentMetadata
): ObjectExpression {
  const properties: any[] = attributes.map(attr => {  
    switch(attr.type) {
      case 'JSXAttribute':
        const key = typeof attr.name.name === 'string' ? identifier(attr.name.name) : identifier(attr.name.name.name);
        if (attr.value === null || attr.value === undefined) {
          return objectProperty(key, nullLiteral());
        }
        let value;
        switch (attr.value.type) {
          case 'StringLiteral':          
            value = stringLiteral(attr.value.value);
            break;
          case 'JSXExpressionContainer':
            if (attr.value.expression.type === 'JSXEmptyExpression') {
              value = nullLiteral();
            } else {
              value = attr.value.expression; 
            }
            break;
          default:
            throw new Jsx2TtlError(`Unsupported JSX attribute value type: ${attr.value.type}`, attr);
        }
        return objectProperty(key, value);
      case 'JSXSpreadAttribute':
        return spreadElement(attr.argument);
      default:
        throw new Jsx2TtlError(`Unsupported JSX attribute type: ${(attr as any).type}`, attr);
    } 
  });

  // add children prop if element has children
  if (children && children.length > 0) {
    const validChildren = children.filter(c => {
      if (c.type === 'JSXText') {
        return c.value.trim().length > 0;
      }
      return true;
    });

    if (validChildren.length === 1) {
      const child = validChildren[0];
      if (child.type === 'JSXText') {
        properties.push(objectProperty(identifier('children'), stringLiteral(child.value)));
      } else if (child.type === 'JSXExpressionContainer') {
        if (child.expression.type !== 'JSXEmptyExpression') {
          properties.push(objectProperty(identifier('children'), child.expression));
        }
      } else {
        properties.push(objectProperty(identifier('children'), child));
      }
    } else if (validChildren.length > 1) {
      const childExps = validChildren.map(child => {
        if (child.type === 'JSXText') {
          return stringLiteral(child.value);
        } else if (child.type === 'JSXExpressionContainer') {
          return child.expression;
        }
        return child;
      });
      properties.push(objectProperty(identifier('children'), arrayExpression(childExps)));
    }
  }

  return objectExpression(properties);
}

/**
 * Returns a string representation of the tag name for a JSXElement
 */
function getTagName(elementName: JSXIdentifier | JSXMemberExpression | JSXNamespacedName): string {
  switch (elementName.type) {
    case 'JSXIdentifier':
      return elementName.name;
    case 'JSXMemberExpression':
      return `${getTagName(elementName.object)}.${getTagName(elementName.property)}`;
    case 'JSXNamespacedName':
      return `${elementName.namespace.name}:${elementName.name.name}`;
    default:
      throw new Jsx2TtlError(`Unknown elementName type: ${(elementName as any).type}`, elementName);
  }
}

/**
 * Determine if a tag name is a JSX Component or a regular HTML tag
 */
function isComponent(tagName: string): boolean {
  return tagName[0] === tagName[0].toUpperCase();
}

export class Jsx2TtlError extends Error {
  node: Node;
  constructor(message: string, node: Node) {
    super(message);
    this.name = "Jsx2TtlError";
    this.node = node;
  }
}
