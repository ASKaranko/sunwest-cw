import { Hono } from 'hono';
import loanRouter from './routes/loan';
import { HTTPException } from 'hono/http-exception';

const app = new Hono();

app.route('/loan', loanRouter);

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}
	throw new HTTPException(500, { message: 'There is a server internal error while processing a loan' })
});

export default app;