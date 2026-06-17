import { App } from "./app.js";
import { config } from "./config/index.js";

const app = new App();
const port = config.app.port;

app.listen(port);
