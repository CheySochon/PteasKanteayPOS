import fs from "fs";

const testFile = Buffer.from("test image data");
fs.writeFileSync("test.png", testFile);

const formData = new FormData();
formData.append("image", new Blob([testFile]), "test.png");

fetch("http://localhost:4000/api/products/upload-image", {
  method: "POST",
  body: formData
}).then(res => res.json()).then(console.log).catch(console.error);
