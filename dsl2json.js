const dsl2json = (dsl) => {
  const formattedDSL = formatDSL(dsl);
  const lines = formattedDSL
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return parseBlock(lines);
};

const formatDSL = (dsl) => {
  let formattedDSL = dsl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
  formattedDSL = formattedDSL
    .replace(/\sIF\s/g, "\nIF ")
    .replace(/\sTHEN\s/g, " THEN\n")
    .replace(/\sELSE\s/g, "\nELSE\n")
    .replace(/\sENDIF\s/g, "\nENDIF\n");
  return formattedDSL;
};

function parseProperty(propertyStr) {
  const property = {};
  propertyStr.split(",").forEach((pair) => {
    const [key, value] = pair
      .split(":")
      .map((item) => item.trim().replace(/["']/g, ""));
    property[key] = isNaN(value) ? value : parseInt(value);
  });
  return property;
}

const parseCondition = (conditionStr) => {
  const params = conditionStr
    .replace(/AND/g, "\nAND")
    .replace(/OR/g, "\nOR")
    .split("\n")
    .map((part) => {
      const param = {};
      if (part.startsWith("AND")) param.operator = "AND";
      if (part.startsWith("OR")) param.operator = "OR";
      part = part.replace("AND ", "").replace("OR ", "");
      if (part.startsWith("NOT")) param.negation = true;
      part = part.replace("NOT ", "");
      param.node = part.match(/(\w+)\s*{[^}]+}/)[1];
      param.property = parseProperty(part.match(/\w+\s*{([^}]+)}/)[1]);
      return param;
    });
  return params;
};

const parseLoop = (loopStr) => {
  const loop = {};
  if (loopStr.startsWith("FOR ")) {
    const match = loopStr.match(/FOR (\w+) = (\d+) TO (\d+)/);
    loop.type = "FOR";
    loop.iterator = match[1];
    loop.start = parseInt(match[2]);
    loop.end = parseInt(match[3]);
  } else if (loopStr.startsWith("FOREACH")) {
    const match = loopStr.match(/FOREACH (\w+) IN (\w+)/);
    loop.type = "FOREACH";
    loop.iterator = match[1];
    loop.collection = match[2];
  }
  return loop;
};

const parseBlock = (lines) => {
  const variables = {};
  const actions = [];
  const conditions = [];
  const loops = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("VAR")) {
      const [, key, value] = line.match(/VAR (\w+) = (\d+|.+\(\))/);
      variables[key] = isNaN(value) ? value : parseInt(value);
    } else if (line.startsWith("IF")) {
      const condition = {};
      const [, conditionStr] = line.match(/IF (.+)/);
      condition.params = parseCondition(conditionStr);
      let counter = 0;
      let j = i + 1;
      while (j < lines.length) {
        if (counter == 0 && lines[j].startsWith("ELSE")) {
          condition.then = parseBlock(lines.slice(i + 1, j));
          i = j;
        }
        if (counter == 0 && lines[j].startsWith("ENDIF")) {
          if (condition.then) {
            condition.else = parseBlock(lines.slice(i + 1, j));
          } else {
            condition.then = parseBlock(lines.slice(i + 1, j));
          }
          i = j;
          break;
        }
        if (lines[j].startsWith("IF")) {
          counter++;
        }
        if (lines[j].startsWith("ENDIF")) {
          counter--;
        }
        j++;
      }
      conditions.push(condition);
    } else if (line.startsWith("FOR") || line.startsWith("FOREACH")) {
      const loop = parseLoop(line);
      let counter = 0;
      let j = i + 1;
      while (j < lines.length) {
        if (counter == 0 && lines[j].startsWith("NEXT")) {
          loop.content = parseBlock(lines.slice(i + 1, j));
          i = j;
          break;
        }
        if (lines[j].startsWith("FOR") || lines[j].startsWith("FOREACH")) {
          counter++;
        }
        if (lines[j].startsWith("NEXT")) {
          counter--;
        }
        j++;
      }
      loops.push(loop);
    } else {
      actions.push(line);
    }
    i++;
  }
  return { variables, actions, conditions, loops };
};

module.exports = dsl2json;
