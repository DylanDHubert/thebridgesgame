/** CREATE STAYS OPEN ONLY WHILE `npm run dev` IS RUNNING. */
export const CREATE_OPEN = process.env.NODE_ENV === "development";
