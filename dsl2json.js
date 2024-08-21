const dsl2json = (dsl) => {
  const lines = dsl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return parseBlock(lines);
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
    .replace(/\sAND/g, "\nAND")
    .replace(/\sOR/g, "\nOR")
    .replace(/\s-/g, "\n-")
    .split("\n")
    .filter((line) => line !== "")
    .map((part) => {
      const param = {};
      if (part.startsWith("AND ")) param.operator = "AND";
      if (part.startsWith("OR ")) param.operator = "OR";
      if (part.startsWith("- ")) param.operator = "-";
      if (part.startsWith("-> ")) param.operator = "->";
      part = part
        .replace("AND ", "")
        .replace("OR ", "")
        .replace("- ", "")
        .replace("-> ", "");
      if (part.startsWith("NOT")) param.negation = true;
      part = part.replace("NOT ", "");
      const match = part.match(/\((.+)\s*{([^}]+)}/);
      if (match) {
        const list = match[1].trim().split(" ");
        param.node = list[0];
        if (list.length > 1) param.type = list[1];
        param.property = parseProperty(match[2]);
      } else {
        param.property = parseProperty(part.match(/{([^}]+)}/)[1]);
      }
      return param;
    });
  return params;
};

const parseLoop = (loopStr) => {
  const loop = {};
  if (loopStr.startsWith("FOR ")) {
    const match = loopStr.match(/FOR (\w+) = (\d+) TO (\d+)/);
    loop.type = "for";
    loop.iterator = match[1];
    loop.start = parseInt(match[2]);
    loop.end = parseInt(match[3]);
  } else if (loopStr.startsWith("FOREACH")) {
    const match = loopStr.match(/FOREACH (\w+) IN (\w+)/);
    loop.type = "foreach";
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
      const condition = [];
      let conditionStr = "";
      [, conditionStr] = line.match(/IF (.+)/);
      let subCondition = {};
      subCondition.type = "if";
      subCondition.params = parseCondition(conditionStr);
      let counter = 0;
      let j = i + 1;
      while (j < lines.length) {
        if (counter == 0 && lines[j].startsWith("ELSE IF")) {
          subCondition.content = parseBlock(lines.slice(i + 1, j));
          condition.push(subCondition);
          [, conditionStr] = lines[j].match(/ELSE IF (.+)/);
          subCondition = {};
          subCondition.type = "elseif";
          subCondition.params = parseCondition(conditionStr);
          i = j;
        } else if (counter == 0 && lines[j].startsWith("ELSE")) {
          subCondition.content = parseBlock(lines.slice(i + 1, j));
          condition.push(subCondition);
          subCondition = {};
          subCondition.type = "else";
          i = j;
        } else if (counter == 0 && lines[j].startsWith("ENDIF")) {
          subCondition.content = parseBlock(lines.slice(i + 1, j));
          condition.push(subCondition);
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
