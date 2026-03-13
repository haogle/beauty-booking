import { bootstrap } from '../src/serverless';

let handler: any;

export default async function (req: any, res: any) {
  if (!handler) {
    handler = await bootstrap();
  }
  handler(req, res);
}
