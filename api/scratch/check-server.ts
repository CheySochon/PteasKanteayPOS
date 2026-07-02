import http from "http";

function check(url: string) {
  http.get(url, (res) => {
    console.log(`URL: ${url} -> Status: ${res.statusCode}`);
  }).on("error", (err) => {
    console.error(`URL: ${url} -> Error: ${err.message}`);
  });
}

check("http://localhost:4000/health");
check("http://localhost:4000/uploads/settings/1782922228776-photo-2026-06-29-08-46-00.jpg");
