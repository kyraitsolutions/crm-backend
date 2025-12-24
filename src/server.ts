import { App } from "./app.js";
import { config } from "./config/index.js";

const app = new App();
const port =
  typeof config.port === "string" ? parseInt(config.port, 10) : config.port;

app.listen(port);
