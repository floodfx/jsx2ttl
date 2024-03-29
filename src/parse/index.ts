import generate from '@babel/generator';
import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import { arrayExpression, callExpression, identifier, importDeclaration, importDefaultSpecifier, importSpecifier, memberExpression, newExpression, nullLiteral, objectExpression, objectProperty, spreadElement, stringLiteral, type Expression, type Identifier, type JSXAttribute, type JSXElement, type JSXEmptyExpression, type JSXIdentifier, type JSXMemberExpression, type JSXNamespacedName, type JSXSpreadAttribute, type Node, type ObjectExpression, type SpreadElement } from '@babel/types';

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
 * Specifically, it converts JSX code to a `Template` class from the `ttl` library. The 
 * constructor of the `Template` class takes two arguments: an array of static strings 
 * and an array of dynamic values.  We traverse the AST of the JSX code and convert
 * JSXElements to `Template` class instances.  We also add an import statement for the
 * `Template` class to the beginning of the code that is generated.
 * 
 * @param jsxCode JSX or TSX code that you want to convert to TTL
 * @param 
 * @returns new code that uses the `Template` class from the `ttl` library
 */
export function jsx2ttl(jsxCode: string, options: JSX2TTLOptions) {
  const reqOpt: Required<JSX2TTLOptions> = {
    importPath: options.importPath,
    importName: options.importName,
    importAs : options.importAs ?? options.importName,
    isDefaultImport: options.isDefaultImport ?? false,
    callWithoutNew: options.callWithoutNew ?? false,
    callWithAdditionalArgsFn: options.callWithAdditionalArgsFn ?? (() => []),
    transformAttribute: options.transformAttribute ?? ((attr) => attr)
  };

  // parse the code into an AST
  const ast = parser.parse(jsxCode, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  // create a new ImportDeclaration for the Template class
  const importSpec = reqOpt.isDefaultImport ? importDefaultSpecifier(identifier(reqOpt.importAs)) : importSpecifier(identifier(reqOpt.importName), identifier(reqOpt.importAs));
  const newImport = importDeclaration(
    [importSpec], 
    stringLiteral(reqOpt.importPath) // source of the import
  );
  // udpate the AST to include the new import statement
  ast.program.body.unshift(newImport);
  
  // now traverse the AST and process JSXElements, ignoring other nodes
  traverse(ast, {
    JSXElement: {
    
      // process deepest nodes first, then work our back up the tree
      exit(path: NodePath<JSXElement>) {
        try {
          // determine if the parent is a function or class
          // if it is a function, we want to call the function with the props
          // if it is a class, we want to call the class constructor with the props, and call the classMethod
          let parentMetadata: JSXElementParentMetadata = {
            type: 'unknown'
          }
          let parentPath: NodePath<Node> | null = path.parentPath;
          var maxDepth = 100; // prevent infinite loops
          while (parentPath && maxDepth-- > 0) {
            // console.log('parentPath:', parentPath.node.type);
            if (parentPath.isFunctionDeclaration() || parentPath.isFunctionExpression()) {
              // console.log('The parent is a function name:', parentPath.node.id!.name);
              parentMetadata = {
                type: 'function',
                name: parentPath.node.id!.name,
                isArrowFunction: false
              }
              break;
            } else if (parentPath.isArrowFunctionExpression()) {
              // console.log('The parent is an arrow function')
              // console.log('The parent is an arrow function', parentPath.parentPath.node);
              parentMetadata = {
                type: 'function',
                name: (parentPath.parentPath.node as any).id?.name,
                isArrowFunction: true
              }
              break;
            } else if (parentPath.isClassDeclaration() || parentPath.isClassExpression()) {
              // console.log('The parent is a class');
              const className = parentPath.node.id!.name;
              // console.log(`The parent is a class named ${className}`);

              const superClassExp = parentPath.node.superClass;
              var superClasses: string[] = [];
              if (superClassExp) {
                switch(superClassExp.type) {
                  case 'Identifier':
                    // console.log(`The class ${className} extends ${superClassExp.name}`);
                    superClasses.push(superClassExp.name);
                    break;
                  case 'ArrayExpression':
                    // console.log(`The class ${className} extends ${superClassExp}`);
                    superClasses = superClassExp.elements.map(e => (e as Identifier).name);
                    break;
                }
              }

              const implementedInterfaces = parentPath.node.implements;   
              var interfaceNames: string[] = [];         
              if (implementedInterfaces && implementedInterfaces.length > 0) {                
                interfaceNames = implementedInterfaces.map(i => {
                  switch(i.type) {
                    case 'ClassImplements':
                      return i.id.name;
                    case 'TSExpressionWithTypeArguments':
                      return (i.expression as Identifier).name;
                  }
                });
                // console.log(`class ${className} implements ${interfaceNames.join(', ')}`);
              }

              parentMetadata = {
                type: 'class',
                name: className,
                interfaces: interfaceNames,
                superClasses: superClasses
              }
              break;
            } 
            parentPath = parentPath.parentPath;
          }

          const newNode = processJSXElement(path.node, reqOpt, parentMetadata);
          // Replace the current node with the new node
          path.replaceWith(newNode);
        } catch(e) {
          // get file name and line numbers for debugging          
          var loc = path.node.loc;
          // extract actual text from path.node
          var nodeText = jsxCode.substring(loc?.start.index ?? 0, loc?.end.index);          
          if(e instanceof Jsx2TtlError) {
            loc = e.node.loc;
            nodeText = jsxCode.substring(loc?.start.index ?? 0, loc?.end.index);            
          } else {
            console.warn(`Error thrown is not ${Jsx2TtlError} so can only provide JSXElement location for debug info`, e);
          }     
          console.error(`Error processing JSXElement at ${loc?.start.line}:${loc?.start.column}-${loc?.end.line}:${loc?.end.column}\n\t${nodeText}\n\t`);
          throw e;
        } 
      },
    },
  });

  // use the modified ast to generate new code
  const { code: newCode } = generate(ast);
  return newCode;
}

/**
 * Process a JSXElement node and return a new AST node that is either a `new Template` expression
 * (e.g. <div>hi</div> => new Template(["<div>hi</div>"], [])) or a call to the Component function 
 * (e.g. <Foo /> => Foo()). 
 * @param element the JSXElement node to process
 * @returns a new AST node that is a `new Template` expression
 */
function processJSXElement(element: JSXElement, options: Required<JSX2TTLOptions>, parentMetadata: JSXElementParentMetadata): Node {
  let statics: string[] = [];
  let dynamics: any[] = [];

  // use tag name to determine if this is a component or a regular HTML tag
  const tagName = getTagName(element.openingElement.name);

  // component is a tag that starts with an uppercase letter like `<Foo />`
  // For component tags we want to call the function `Foo()`, passing in the props
  // We do NOT call transformAttrubtes here but instead on the attributes in
  // the implementation of `Foo()` (i.e. html content in the `render` method of `Foo`)
  if (isComponent(tagName)) {
    // make a call or new expression to the component function based on the parent metadata
    const props = getProps(element.openingElement.attributes);
    if(parentMetadata.type === 'function') {
      const componentFunction = identifier(tagName);
      const callExp = callExpression(componentFunction, [props]);
      return callExp;
    } else if(parentMetadata.type === 'class') {
      const newExp = newExpression(identifier(tagName), [props]);
      const callExp = callExpression(memberExpression(newExp, identifier('render')), []);
      return callExp;
    } else {
      throw new Jsx2TtlError(`Unknown parentMetadata type: ${(parentMetadata as any).type}`, element);
    }
  }

  // not a component, so we want to create a new Template instance
  statics.push(`<${tagName}`);
  element.openingElement.attributes.forEach(attr => {
    if (attr.type === 'JSXAttribute') {
      const newAttr = options.transformAttribute(attr);
      const name = newAttr.name.name;
      let value: string | Expression | JSXEmptyExpression;
      if (newAttr.value === null || newAttr.value === undefined) {
        return; // don't add null or undefined attributes
      }      
      switch (newAttr.value.type) {
        case 'StringLiteral':
          value = newAttr.value?.value;
          // we append to current static because attribute should always be closed
          statics[statics.length-1] += ` ${name}="${value}"`;
          break;        
        case 'JSXExpressionContainer':
          value = newAttr.value?.expression;
          // we append to current static because attribute should always be closed
          statics[statics.length-1] += ` ${name}="`;
          dynamics.push(newAttr.value?.expression);
          // close the attribute
          statics.push(`"`);
          break;
        // TODO: handle these cases?
        // case 'JSXElement':
        // case 'JSXFragment':
        //   statics[statics.length-1] += ` ${name}="`;
        //   dynamics.push(attr.value);
        //   // close the attribute
        //   statics.push(`"`);
        //   break;
        default:
          throw new Jsx2TtlError(`Unhandled JSXAttribute value type: ${(newAttr.value as any).type}`, attr);
      }
    } else if (attr.type === 'JSXSpreadAttribute') {
      // TODO test this...  do we need to loop?
      statics[statics.length-1] += ' ';
      dynamics.push(attr.argument);      
    }
  });
  // close tag
  // if no children and no closing tag, then close the tag
  if (element.children.length === 0 && !element.closingElement) {
    statics[statics.length-1] += ' />';
  } else {
    statics[statics.length-1] += '>';
  }
  

  // next we want to process the children of the element
  let lastOperationWasDynamic = false; // keep track of whether the last operation was dynamic or static
  element.children.forEach(child => {
    if (child.type === 'JSXText') {
      // either append to the last static or push a new one
      if(lastOperationWasDynamic) {
        statics.push(child.value);
      }
      else {
        statics[statics.length-1] += child.value;
      }
      lastOperationWasDynamic = false;
    } else if (child.type === 'JSXExpressionContainer') {
      dynamics.push(child.expression);
      lastOperationWasDynamic = true;      
    } else if ((child as any).type === 'NewExpression' || (child as any).type === 'CallExpression'){
      // NewExpression is JSXElement that was processed into a new Template
      // CallExpression is JSXElement that was processed into a call to a component function
      dynamics.push(child);
      lastOperationWasDynamic = true;     
    } else if(child.type === 'JSXElement') {
      // theoretically, there should be no child JSXElements, as we should have processed them already
      throw new Jsx2TtlError(`Unexpected JSXElement: ${child}`, child);
    } else {
      throw new Jsx2TtlError(`Unexpected JSXElement: ${child}`, child);   
    }
  });

  // close the tag
  if (element.closingElement) {
    if(lastOperationWasDynamic) {
      statics.push(`</${tagName}>`);
    }
    else {
      statics[statics.length-1] += `</${tagName}>`;
    }
  }

  // check invariant that statics should be one more than dynamics
  if(statics.length !== dynamics.length + 1) {
    throw new Jsx2TtlError(`Statics should have one more items than dynamics so there was a parsing error: statics.length=${statics.length}, dynamics.length=${dynamics.length}.  \n\nstatics=${JSON.stringify(statics)}, \n\ndynamics=${JSON.stringify(dynamics)}`, element);
  }

  // if statics is 1, then dynamics should be 0
  // TODO: in this case, we can do we return a string literal instead of a new Template?
  // if(statics.length === 1) {
  //   return stringLiteral(statics[0]);
  // }
  
  // transform this JSXElement into a tagged template literal call
  // which can be a call to a function (i.e. myTTLFunc) or a new expression (i.e. new MyTTLClass)
  const additionalArgs = options.callWithAdditionalArgsFn(parentMetadata);
  if(options.callWithoutNew) {
    return callExpression(identifier(options.importAs), // function name
      [
        arrayExpression(statics.map(stringLiteral)), // statics
        arrayExpression(dynamics), // dynamics
        ...additionalArgs
      ]
    );
  } else {
    return newExpression(
      identifier(options.importAs), // class name
      [
        arrayExpression(statics.map(stringLiteral)), // statics
        arrayExpression(dynamics), // dynamics
        ...additionalArgs
      ]
    );
  }  
}

/**
 * Handle the JSX attributes and return an ObjectExpression for them
 * @param attributes the attributes of a JSXElement
 * @returns an ObjectExpression for the attributes
 */
function getProps(attributes: Array<JSXAttribute | JSXSpreadAttribute>): ObjectExpression {
  const properties = attributes.map(attr => {  
    switch(attr.type) {
      case 'JSXAttribute':
        const key = typeof attr.name.name === 'string' ? identifier(attr.name.name) : identifier(attr.name.name.name);
        // handle null or undefined values
        if (attr.value === null || attr.value === undefined) {
          // or skip?
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
              // TODO process this further?
              value = attr.value.expression; 
            }
            break;
          default:
            throw new Jsx2TtlError(`Unsupported JSX attribute value type: ${attr.value.type}`, attr);
        }
        return objectProperty(key, value);
      case 'JSXSpreadAttribute':
        // TODO Handle spread attributes
        return spreadElement(attr.argument);
      default:
        throw new Jsx2TtlError(`Unsupported JSX attribute type: ${(attr as any).type}`, attr);
    } 
  });
  return objectExpression(properties);
}

/**
 * Returns a string representation of the tag name for a JSXElement
 * @param elementName 
 * @returns 
 */
function getTagName(elementName: JSXIdentifier | JSXMemberExpression | JSXNamespacedName): string {
  switch (elementName.type) {
    case 'JSXIdentifier':
      return elementName.name;
    case 'JSXMemberExpression':
      // Recursively process the object and property
      return `${getTagName(elementName.object)}.${getTagName(elementName.property)}`;
    case 'JSXNamespacedName':
      return `${elementName.namespace.name}:${elementName.name.name}`;
    default:
      throw new Jsx2TtlError(`Unknown elementName type: ${(elementName as any).type}`, elementName);
  }
}

/**
 * Determine if a tag name is a JSX Component or a regular HTML tag
 * @param tagName the name of the tag
 * @returns true if the tag name is a JSX Component
 */
function isComponent(tagName: string): boolean {
  // Check if the first character is uppercase
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
