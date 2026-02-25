
import { z } from 'zod';

const schema = z.object({
  feedUrl: z.string().trim().url(),
});

try {
  const input = " `https://sspai.com/feed` ";
  console.log(`Input: '${input}'`);
  const parsed = schema.parse({ feedUrl: input });
  console.log("Parsed:", parsed);
} catch (e) {
  console.log("Error name:", e.name);
  console.log("Error instanceof ZodError:", e instanceof z.ZodError);
  console.log("Error details:", JSON.stringify(e.errors, null, 2));
}
