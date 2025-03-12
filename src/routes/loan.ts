import { Hono } from 'hono';
import { Bindings } from '../types/bindings';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: Bindings }>();

app.post('/', async (c) => {
	try {
		const loan = await c.req.json();
		const bearerString = c.req.header('Authorization');

		if (!bearerString) {
			throw new HTTPException(401, { message: 'Bearer is not specified' });
		}

		const token = bearerString.split(' ')[1];

		if (token !== c.env.SUNWEST_TOKEN) {
			throw new HTTPException(401, { message: 'Invalid token' });
		}

		// Redirect the request to Salesforce
		const response = await fetch(c.env.SALESFORCE_SANDBOX_WEBHOOK_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-auth-token': token || '',
			},
			body: JSON.stringify(loan),
		});

		// Handle different status codes from Salesforce
		try {
			await response.json();
		} catch (e) {
			throw new HTTPException(500, { message: 'Failed to parse response from Salesforce' });
		}

		switch (response.status) {
			case 200:
				return c.json(
					{
						success: true,
						message: 'Loan successfully processed'
					},
					200
				);
			case 400:
				return c.json(
					{
						success: false,
						message: 'Bad request to Salesforce'
					},
					400
				);
			case 401:
				return c.json(
					{
						success: false,
						message: 'Authentication in Salesforce failed'
					},
					401
				);
			case 500:
				return c.json(
					{
						success: false,
						message: 'Internal server error in Salesforce'
					},
					500
				);
		}
	} catch (error) {
		if (error instanceof HTTPException) {
			return error.getResponse();
		}

		console.error('Loan processing error:', error);
		return c.json(
			{
				success: false,
				error: 'Failed to process loan',
				message: error instanceof Error ? error.message : 'Unknown error occurred',
			},
			500
		);
	}
});

export default app;
