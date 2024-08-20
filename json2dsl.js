const json2dsl = (json) => {
  return parseBlock(json, 0);
}

const parseCondition = (params) => {
  let condition = "";
  for (let param of params) {
    if (param.operator) {
      condition += ` ${param.operator} `;
    }
    if (param.negation) {
      condition += "NOT ";
    }    
    const [key, value] = Object.entries(param.property)[0]; 
    condition += `(${param.node} {${key}: "${value}"})`;
  }
  return condition;
}

const parseBlock = (json, indentLevel) => {
  let code = "";
  let indent = "    ".repeat(indentLevel);
  if (json.variables) {
    for (let [key, value] of Object.entries(json.variables)) {
      code += `${indent}VAR ${key} = ${value}\n`;
    }
  }
  if (json.actions) {
    for (let action of json.actions) {
      code += `${indent}${action}\n`;
    }
  }
  if (json.conditions) {
    for (let condition of json.conditions) {
      for (let subCondition of condition) {
        if (subCondition.type === "if") {
          code += `${indent}IF ${parseCondition(subCondition.params)} THEN\n`;
          code += parseBlock(subCondition.content, indentLevel + 1);
        } else if (subCondition.type === "elseif") {
          code += `${indent}ELSE IF ${parseCondition(subCondition.params)} THEN\n`;
          code += parseBlock(subCondition.content, indentLevel + 1);
        } else if (subCondition.type === "else") {
          code += `${indent}ELSE\n`;
          code += parseBlock(subCondition.content, indentLevel + 1);
        }
      }
      code += `${indent}ENDIF\n`;
    }
  }
  if (json.loops) {
    for (let loop of json.loops) {
      if (loop.type === "FOR") {
        code += `${indent}FOR ${loop.iterator} = ${loop.start} TO ${loop.end}\n`;
        code += parseBlock(loop.content, indentLevel + 1);
        code += `${indent}NEXT ${loop.iterator}\n`;
      } else if (loop.type === "FOREACH") {
        code += `${indent}FOREACH ${loop.iterator} IN ${loop.collection}\n`;
        code += parseBlock(loop.content, indentLevel + 1);
        code += `${indent}NEXT ${loop.iterator}\n`;
      }
    }
  }
  return code;
}

module.exports = json2dsl;