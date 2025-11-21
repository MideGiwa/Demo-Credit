import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary();
    table.string("email", 255).notNullable().unique();
    table.string("username", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.enum("role", ["admin", "user"]).notNullable().defaultTo("user");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.boolean("verified").notNullable().defaultTo(false);
    table.boolean("email_verified").notNullable().defaultTo(false);
    table.integer("token_version").notNullable().defaultTo(0);
    // wallet_id FK will be added after wallets table is created
    table.uuid("wallet_id").nullable();
    table.decimal("rating", 3, 2).nullable();
    table.text("bio").nullable();
    table.dateTime("last_login").nullable();
    table.string("password_reset_token", 255).nullable();
    table.dateTime("password_reset_expires").nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("wallets", (table) => {
    table.uuid("id").primary();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.decimal("balance", 14, 2).notNullable().defaultTo(0);
    table.string("currency", 10).notNullable().defaultTo("NGN");
    table.enum("status", ["active", "frozen", "closed"]).notNullable().defaultTo("active");
    table.timestamps(true, true);
  });

  // Add foreign key to users table now that wallets table exists
  await knex.schema.alterTable("users", (table) => {
    table
      .foreign("wallet_id")
      .references("id")
      .inTable("wallets")
      .onDelete("SET NULL");
  });

  await knex.schema.createTable("auth_tokens", (table) => {
    table.uuid("id").primary();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("token", 512).notNullable();
    table.string("user_agent", 512).nullable();
    table.string("ip_address", 255).nullable();
    table.dateTime("expires_at").notNullable();
    table.boolean("revoked").notNullable().defaultTo(false);
    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("auth_tokens");

  // Drop foreign key from users table first to break circular dependency
  try {
    await knex.schema.alterTable("users", (table) => {
      table.dropForeign("wallet_id");
    });
  } catch (e) {
    // Ignore if constraint doesn't exist (e.g. if table creation failed halfway)
  }

  await knex.schema.dropTableIfExists("wallets");
  await knex.schema.dropTableIfExists("users");
}

