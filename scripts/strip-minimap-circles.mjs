import fs from "fs";
import path from "path";

const dir = path.resolve("vr-react/src/assets/minimap");
for (const name of ["floor-i.svg", "floor-ii.svg", "floor-iii.svg"]) {
  const file = path.join(dir, name);
  let svg = fs.readFileSync(file, "utf8");
  const before = (svg.match(/<circle\b/g) || []).length;
  svg = svg.replace(/<circle\b[^>]*\/>\s*/g, "");
  const after = (svg.match(/<circle\b/g) || []).length;
  fs.writeFileSync(file, svg);
  console.log(name, "circles", before, "->", after);
}
