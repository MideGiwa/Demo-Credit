import knex from "knex";
import dotenv from "dotenv";
import knexConfig from "../knexfile";

dotenv.config();

const environment = process.env.NODE_ENV || "development";
const config = knexConfig[environment];

export const db = knex(config);


