import generate from '@babel/generator';
import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import { arrayExpression, callExpression, identifier, importDeclaration, importSpecifier, newExpression, nullLiteral, objectExpression, objectProperty, spreadElement, stringLiteral, type JSXAttribute, type JSXElement, type JSXIdentifier, type JSXMemberExpression, type JSXNamespacedName, type JSXSpreadAttribute, type ObjectExpression } from '@babel/types';


/**
 * jsx2ttl converts JSX code to TTL code.  
 * Specifically, it converts JSX code to a `Template` class from the `ttl` library. The 
 * constructor of the `Template` class takes two arguments: an array of static strings 
 * and an array of dynamic values.  We traverse the AST of the JSX code and convert
 * JSXElements to `Template` class instances.  We also add an import statement for the
 * `Template` class to the beginning of the code that is generated.
 * 
 * @param jsxCode JSX or TSX code that you want to convert to TTL
 * @param templateLibDir the relative or absolute path to the `Template` library
 * @returns new code that uses the `Template` class from the `ttl` library
 */
export function jsx2ttl(jsxCode: string, templateLibDir: string = '../src/ttl') {

  // parse the code into an AST
  const ast = parser.parse(jsxCode, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  // create a new ImportDeclaration for the Template class
  const newImport = importDeclaration(
    // identifiers are same unless you want to rename the import
    [importSpecifier(identifier('Template'), identifier('Template'))], 
    stringLiteral(templateLibDir) // source of the import
  );
  // udpate the AST to include the new import statement
  ast.program.body.unshift(newImport);
  
  // now traverse the AST and process JSXElements, ignoring other nodes
  traverse(ast, {
    JSXElement: {
    
      // process deepest nodes first, then work our back up the tree
      exit(path: NodePath<JSXElement>) {

        const newNode = processJSXElement(path.node);
        // Replace the current node with the new node
        path.replaceWith(newNode);

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
function processJSXElement(element: JSXElement) {
  let statics: string[] = [];
  let dynamics: any[] = [];

  // use tag name to determine if this is a component or a regular HTML tag
  const tagName = getTagName(element.openingElement.name);

  // component tags we want to call the function, passing in the props
  if (isComponent(tagName)) {
    // Call the component function and add its return value to the dynamics array
    const componentFunction = identifier(tagName);
    const props = getProps(element.openingElement.attributes);
    const callExp = callExpression(componentFunction, [props]);
    return callExp;
  }

  // not a component, so we want to create a new Template instance
  let openingTag = `<${tagName}`;
  element.openingElement.attributes.forEach(attr => {
    if (attr.type === 'JSXAttribute') {
      let value = '';
      if (attr.value === null || attr.value === undefined) {
        return; // don't add null or undefined attributes
      }
      switch (attr.value.type) {
        case 'StringLiteral':
          value = attr.value.value;
          break;
        case 'JSXElement':
        case 'JSXFragment':
          dynamics.push(attr.value);
          return; // Skip adding this attribute to the opening tag
        case 'JSXExpressionContainer':
          dynamics.push(attr.value.expression);
          return; // Skip adding this attribute to the opening tag
        default:
          throw new Error(`Unknown JSXAttribute value type: ${(attr.value as any).type}`);
      }
      // TODO this can't be right, as for JSXElements, JSXFragment, and JSXExpressionContainer, we want to add to dynamics      
      openingTag += ` ${attr.name.name}="${value}"`;
    } else if (attr.type === 'JSXSpreadAttribute') {
      dynamics.push(attr.argument);
    }
  });
  openingTag += '>';
  statics.push(openingTag);

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
      // Dynamic content
      dynamics.push(child.expression);
      lastOperationWasDynamic = true;      
    } else if ((child as any).type === 'NewExpression' || (child as any).type === 'CallExpression'){
      // NewExpression is JSXElement that was processed into a new Template
      // CallExpression is JSXElement that was processed into a call to a component function
      dynamics.push(child);
      lastOperationWasDynamic = true;     
    } else if(child.type === 'JSXElement') {
      // theoretically, there should be no child JSXElements, as we should have processed them already
      throw new Error(`Unexpected JSXElement: ${child}`);
    } else {
      throw new Error(`Unexpected child type: ${child.type}`);      
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
  
  // transform this JSXElement into a `new Template` node
  const newNode = newExpression(
    identifier('Template'), // class name
    [
      arrayExpression(statics.map(stringLiteral)), // statics
      arrayExpression(dynamics) // dynamics
    ] // constructor arguments
  );
  return newNode;
}

/**
 * Handle the JSX attributes and return an ObjectExpression for them
 * @param attributes the attributes of a JSXElement
 * @returns an ObjectExpression for the attributes
 */
function getProps(attributes: Array<JSXAttribute | JSXSpreadAttribute>): ObjectExpression {
  const properties = attributes.map(attr => {
    if (attr.type === 'JSXAttribute') {
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
            value = attr.value.expression; // You might need to process this value depending on its type
          }
          break;
        default:
          throw new Error(`Unsupported JSX attribute value type: ${attr.value.type}`);
      }
      return objectProperty(key, value);
    } else if (attr.type === 'JSXSpreadAttribute') {
      // Handle spread attributes
      // You might need to process attr.argument depending on its type
      return spreadElement(attr.argument);
    } else {
      throw new Error(`Unsupported JSX attribute type: ${(attr as any).type}`);
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
      throw new Error(`Unknown elementName type: ${(elementName as any).type}`);
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
