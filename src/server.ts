import { App } from './app';
import { config } from './config';

const app = new App();
const port = typeof config.port === 'string' ? parseInt(config.port, 10) : config.port;

app.listen(port);
