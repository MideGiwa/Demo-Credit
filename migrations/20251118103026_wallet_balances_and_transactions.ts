import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("wallets", (table) => {
    table
      .decimal("available_balance", 14, 2)
      .notNullable()
      .defaultTo(0);
    table
      .decimal("ledger_balance", 14, 2)
      .notNullable()
      .defaultTo(0);
    table
      .decimal("loan_balance", 14, 2)
      .notNullable()
      .defaultTo(0);

    table.dropColumn("balance");
  });

  await knex.schema.createTable("wallet_transactions", (table) => {
    table.uuid("id").primary();
    table
      .uuid("wallet_id")
      .notNullable()
      .references("id")
      .inTable("wallets")
      .onDelete("CASCADE");
    table
      .enu("type", [
        "FUND",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "WITHDRAW",
        "LOAN_DISBURSE",
        "LOAN_REPAY",
      ])
      .notNullable();
    table.decimal("amount", 14, 2).notNullable();
    table.string("currency", 10).notNullable().defaultTo("NGN");
    table.enu("status", ["pending", "completed", "failed"]).notNullable().defaultTo("completed");
    table.string("reference", 255).notNullable().unique();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    table.index(["wallet_id"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("wallet_transactions");

  await knex.schema.alterTable("wallets", (table) => {
    table.decimal("balance", 14, 2).notNullable().defaultTo(0);
    table.dropColumn("available_balance");
    table.dropColumn("ledger_balance");
    table.dropColumn("loan_balance");
  });
}

