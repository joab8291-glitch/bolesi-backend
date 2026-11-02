require("dotenv").config();
const app = require("./app");

const port = Number(process.env.PORT || 10000);
app.listen(port, "0.0.0.0", () => {
  console.log(`BOLESI API listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});