import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpAuthContext } from "@/lib/mcp-auth";
import {
  applyBalanceMap,
  fetchAccountBalanceMap,
} from "@/lib/account-balances";
import { monthBoundsUtc } from "@/lib/month-bounds";
import {
  monthIncomeExpense,
  rollupByCategory,
  type LedgerTx,
} from "@/lib/ledger-aggregates";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MONEY = z.number().finite();
const POSITIVE_MONEY = z.number().finite().positive();
const ISO_DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const YEAR_MONTH = z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");

function txDateToIso(d: string): string {
  return `${d.slice(0, 10)}T12:00:00.000Z`;
}

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(payload: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function err(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/**
 * Builds an McpServer instance scoped to the caller's (user_id, port_id).
 * Every tool mutates or reads data for that one portfolio only.
 */
export function buildFinatraMcpServer(
  supabase: SupabaseClient,
  auth: McpAuthContext
): McpServer {
  const server = new McpServer(
    { name: "finatra-ai", version: "0.1.0" },
    {
      instructions:
        "Finatra finance assistant. Tools operate on a single portfolio " +
        "(personal or business) scoped to the caller's bearer token. " +
        "Categories are free text on transactions but you can also manage a " +
        "typed catalog in the categories table. Amounts are always positive; " +
        "transaction_type ('income' | 'expense' | 'transfer') determines " +
        "the direction. Transfers require both account_id and to_account_id.",
    }
  );

  const { port_id } = auth;

  // ---------- account groups ----------

  server.registerTool(
    "list_account_groups",
    {
      description:
        "List account groups (folders) in this portfolio. Accounts belong to groups.",
      inputSchema: {},
    },
    async () => {
      const { data, error } = await supabase
        .from("account_groups")
        .select("group_id, group_name, port_id")
        .eq("port_id", port_id)
        .order("group_name");
      if (error) return err(error.message);
      return ok({ groups: data ?? [] });
    }
  );

  server.registerTool(
    "create_account_group",
    {
      description: "Create a new account group in this portfolio.",
      inputSchema: {
        group_name: z.string().min(1).max(256),
        group_type: z.string().max(64).optional(),
      },
    },
    async ({ group_name, group_type }) => {
      const { data, error } = await supabase
        .from("account_groups")
        .insert({
          port_id,
          user_id: auth.user_id,
          group_name: group_name.trim(),
          group_type: group_type?.trim() || "default",
        })
        .select("group_id, group_name, port_id")
        .single();
      if (error || !data) return err(error?.message ?? "Insert failed");
      return ok({ group: data });
    }
  );

  server.registerTool(
    "update_account_group",
    {
      description: "Rename or retype an existing account group.",
      inputSchema: {
        group_id: z.string().uuid(),
        group_name: z.string().min(1).max(256).optional(),
        group_type: z.string().max(64).optional(),
      },
    },
    async ({ group_id, group_name, group_type }) => {
      const { data: existing } = await supabase
        .from("account_groups")
        .select("port_id")
        .eq("group_id", group_id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");

      const patch: Record<string, string> = {};
      if (group_name !== undefined) patch.group_name = group_name.trim();
      if (group_type !== undefined) patch.group_type = group_type.trim();
      if (Object.keys(patch).length === 0) return err("No fields to update");

      const { data, error } = await supabase
        .from("account_groups")
        .update(patch)
        .eq("group_id", group_id)
        .select("group_id, group_name, port_id")
        .single();
      if (error || !data) return err(error?.message ?? "Update failed");
      return ok({ group: data });
    }
  );

  server.registerTool(
    "delete_account_group",
    {
      description:
        "Delete an account group. Fails if the group still contains accounts unless cascade=true is given (which also deletes those accounts and their transactions).",
      inputSchema: {
        group_id: z.string().uuid(),
        cascade: z.boolean().optional(),
      },
    },
    async ({ group_id, cascade }) => {
      const { data: existing } = await supabase
        .from("account_groups")
        .select("port_id")
        .eq("group_id", group_id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");

      if (!cascade) {
        const { count } = await supabase
          .from("accounts")
          .select("account_id", { count: "exact", head: true })
          .eq("group_id", group_id);
        if ((count ?? 0) > 0) {
          return err(
            `Group still has ${count} account(s). Retry with cascade=true to delete them and their transactions.`
          );
        }
      }

      const { error } = await supabase
        .from("account_groups")
        .delete()
        .eq("group_id", group_id);
      if (error) return err(error.message);
      return ok({ deleted: group_id });
    }
  );

  // ---------- accounts ----------

  server.registerTool(
    "list_accounts",
    {
      description:
        "List accounts in this portfolio with current ledger balances (from transactions).",
      inputSchema: {},
    },
    async () => {
      const [accRes, balanceMap] = await Promise.all([
        supabase
          .from("accounts")
          .select(
            "account_id, name, port_id, amount, group_id, description, hidden, in_total, created_at"
          )
          .eq("port_id", port_id)
          .order("name"),
        fetchAccountBalanceMap(supabase),
      ]);
      if (accRes.error) return err(accRes.error.message);
      const accounts = applyBalanceMap(accRes.data ?? [], balanceMap);
      return ok({ accounts });
    }
  );

  server.registerTool(
    "create_account",
    {
      description:
        "Create a new account in a specific group. group_id must belong to this portfolio.",
      inputSchema: {
        name: z.string().min(1).max(256),
        group_id: z.string().uuid(),
        description: z.string().max(2000).optional(),
        amount: MONEY.optional(),
        hidden: z.boolean().optional(),
        in_total: z.boolean().optional(),
      },
    },
    async ({ name, group_id, description, amount, hidden, in_total }) => {
      const { data: grp } = await supabase
        .from("account_groups")
        .select("group_id, port_id")
        .eq("group_id", group_id)
        .maybeSingle();
      if (!grp || grp.port_id !== port_id)
        return err("group_id not in this portfolio");

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          name: name.trim(),
          group_id,
          user_id: auth.user_id,
          port_id,
          description: description?.trim() || null,
          amount: amount ?? 0,
          hidden: hidden ?? false,
          in_total: in_total ?? true,
        })
        .select(
          "account_id, name, port_id, amount, group_id, description, created_at"
        )
        .single();
      if (error || !data) return err(error?.message ?? "Insert failed");
      return ok({ account: data });
    }
  );

  server.registerTool(
    "update_account",
    {
      description: "Update an existing account's fields.",
      inputSchema: {
        account_id: z.string().uuid(),
        name: z.string().min(1).max(256).optional(),
        group_id: z.string().uuid().optional(),
        description: z.string().max(2000).nullable().optional(),
        amount: MONEY.optional(),
        hidden: z.boolean().optional(),
        in_total: z.boolean().optional(),
      },
    },
    async ({ account_id, ...fields }) => {
      const { data: existing } = await supabase
        .from("accounts")
        .select("port_id")
        .eq("account_id", account_id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");

      const patch: Record<string, unknown> = {};
      if (fields.name !== undefined) patch.name = fields.name.trim();
      if (fields.description !== undefined)
        patch.description = fields.description?.trim() || null;
      if (fields.amount !== undefined) patch.amount = fields.amount;
      if (fields.hidden !== undefined) patch.hidden = fields.hidden;
      if (fields.in_total !== undefined) patch.in_total = fields.in_total;
      if (fields.group_id !== undefined) {
        const { data: grp } = await supabase
          .from("account_groups")
          .select("port_id")
          .eq("group_id", fields.group_id)
          .maybeSingle();
        if (!grp || grp.port_id !== port_id)
          return err("group_id not in this portfolio");
        patch.group_id = fields.group_id;
      }
      if (Object.keys(patch).length === 0) return err("No fields to update");

      const { data, error } = await supabase
        .from("accounts")
        .update(patch)
        .eq("account_id", account_id)
        .select(
          "account_id, name, port_id, amount, group_id, description, created_at"
        )
        .single();
      if (error || !data) return err(error?.message ?? "Update failed");
      return ok({ account: data });
    }
  );

  server.registerTool(
    "delete_account",
    {
      description:
        "Delete an account. Its transactions will also be deleted if the DB cascades; otherwise this fails.",
      inputSchema: { account_id: z.string().uuid() },
    },
    async ({ account_id }) => {
      const { data: existing } = await supabase
        .from("accounts")
        .select("port_id")
        .eq("account_id", account_id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");

      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("account_id", account_id);
      if (error) return err(error.message);
      return ok({ deleted: account_id });
    }
  );

  // ---------- categories ----------

  server.registerTool(
    "list_categories",
    {
      description:
        "List typed income/expense categories in this portfolio. Optional filter by type or parent.",
      inputSchema: {
        type: z.enum(["income", "expense"]).optional(),
        parent_id: z.number().int().nullable().optional(),
      },
    },
    async ({ type, parent_id }) => {
      let q = supabase
        .from("categories")
        .select("id, name, parent_id, port_id, type, created_at, updated_at")
        .eq("port_id", port_id)
        .order("name");
      if (type) q = q.eq("type", type);
      if (parent_id !== undefined) {
        q = parent_id === null ? q.is("parent_id", null) : q.eq("parent_id", parent_id);
      }
      const { data, error } = await q;
      if (error) return err(error.message);
      return ok({ categories: data ?? [] });
    }
  );

  server.registerTool(
    "create_category",
    {
      description: "Create a typed category (income or expense).",
      inputSchema: {
        name: z.string().min(1).max(256),
        type: z.enum(["income", "expense"]),
        parent_id: z.number().int().positive().nullable().optional(),
      },
    },
    async ({ name, type, parent_id }) => {
      if (parent_id != null) {
        const { data: parent } = await supabase
          .from("categories")
          .select("port_id")
          .eq("id", parent_id)
          .maybeSingle();
        if (!parent || parent.port_id !== port_id)
          return err("parent_id not in this portfolio");
      }
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          type,
          parent_id: parent_id ?? null,
          port_id,
        })
        .select("id, name, parent_id, port_id, type, created_at, updated_at")
        .single();
      if (error || !data) return err(error?.message ?? "Insert failed");
      return ok({ category: data });
    }
  );

  server.registerTool(
    "update_category",
    {
      description: "Update a category's name, type, or parent.",
      inputSchema: {
        id: z.number().int().positive(),
        name: z.string().min(1).max(256).optional(),
        type: z.enum(["income", "expense"]).optional(),
        parent_id: z.number().int().positive().nullable().optional(),
      },
    },
    async ({ id, name, type, parent_id }) => {
      const { data: existing } = await supabase
        .from("categories")
        .select("port_id")
        .eq("id", id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");

      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name.trim();
      if (type !== undefined) patch.type = type;
      if (parent_id !== undefined) {
        if (parent_id != null) {
          const { data: p } = await supabase
            .from("categories")
            .select("port_id")
            .eq("id", parent_id)
            .maybeSingle();
          if (!p || p.port_id !== port_id)
            return err("parent_id not in this portfolio");
        }
        patch.parent_id = parent_id;
      }
      if (Object.keys(patch).length === 0) return err("No fields to update");

      const { data, error } = await supabase
        .from("categories")
        .update(patch)
        .eq("id", id)
        .select("id, name, parent_id, port_id, type, created_at, updated_at")
        .single();
      if (error || !data) return err(error?.message ?? "Update failed");
      return ok({ category: data });
    }
  );

  server.registerTool(
    "delete_category",
    {
      description:
        "Delete a category from the catalog. Transaction rows reference the name string and are unaffected.",
      inputSchema: { id: z.number().int().positive() },
    },
    async ({ id }) => {
      const { data: existing } = await supabase
        .from("categories")
        .select("port_id")
        .eq("id", id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) return err(error.message);
      return ok({ deleted: id });
    }
  );

  // ---------- transactions ----------

  server.registerTool(
    "list_transactions",
    {
      description:
        "List transactions in this portfolio. Filter by month (YYYY-MM), category (exact match), or account (matches from or to side).",
      inputSchema: {
        month: YEAR_MONTH.optional(),
        category: z.string().optional(),
        account_id: z.string().uuid().optional(),
        limit: z.number().int().positive().max(8000).optional(),
      },
    },
    async ({ month, category, account_id, limit }) => {
      let q = supabase
        .from("transactions")
        .select(
          "transaction_id, transaction_date, description, note, category, amount, transaction_type, account_id, to_account_id, created_at"
        )
        .eq("port_id", port_id);

      if (month) {
        const b = monthBoundsUtc(month);
        if (!b) return err("Invalid month (use YYYY-MM)");
        q = q.gte("transaction_date", b.start).lte("transaction_date", b.end);
      }
      if (category?.trim()) q = q.eq("category", category.trim());
      if (account_id && UUID_RE.test(account_id))
        q = q.or(`account_id.eq.${account_id},to_account_id.eq.${account_id}`);

      const { data, error } = await q
        .order("transaction_date", { ascending: false })
        .limit(limit ?? 500);
      if (error) return err(error.message);
      return ok({ transactions: data ?? [], count: data?.length ?? 0 });
    }
  );

  server.registerTool(
    "get_transaction",
    {
      description: "Fetch one transaction by id.",
      inputSchema: { transaction_id: z.string().uuid() },
    },
    async ({ transaction_id }) => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "transaction_id, transaction_date, description, note, category, amount, transaction_type, account_id, to_account_id, port_id, created_at"
        )
        .eq("transaction_id", transaction_id)
        .eq("port_id", port_id)
        .maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Not found");
      return ok({ transaction: data });
    }
  );

  server.registerTool(
    "create_transaction",
    {
      description:
        "Create a transaction. amount is always positive; direction is set by transaction_type. Transfers require to_account_id (different from account_id).",
      inputSchema: {
        transaction_date: ISO_DATE,
        account_id: z.string().uuid(),
        category: z.string().min(1).max(512),
        amount: POSITIVE_MONEY,
        transaction_type: z.enum(["income", "expense", "transfer"]),
        note: z.string().max(4000).optional(),
        description: z.string().max(4000).optional(),
        to_account_id: z.string().uuid().optional(),
      },
    },
    async (args) => {
      if (args.transaction_type === "transfer") {
        if (!args.to_account_id) return err("Transfers require to_account_id");
        if (args.to_account_id === args.account_id)
          return err("to_account_id must differ from account_id");
      }

      const { data: acc } = await supabase
        .from("accounts")
        .select("port_id")
        .eq("account_id", args.account_id)
        .maybeSingle();
      if (!acc || acc.port_id !== port_id)
        return err("account_id not in this portfolio");

      if (args.transaction_type === "transfer") {
        const { data: acc2 } = await supabase
          .from("accounts")
          .select("port_id")
          .eq("account_id", args.to_account_id!)
          .maybeSingle();
        if (!acc2 || acc2.port_id !== port_id)
          return err("to_account_id not in this portfolio");
      }

      const insert = {
        account_id: args.account_id,
        transaction_date: txDateToIso(args.transaction_date),
        note: args.note?.trim() || null,
        description: args.description?.trim() || null,
        category: args.category.trim(),
        amount: args.amount,
        transaction_type: args.transaction_type,
        to_account_id:
          args.transaction_type === "transfer" ? args.to_account_id! : null,
        uid: auth.user_id,
        port_id,
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert(insert)
        .select(
          "transaction_id, transaction_date, description, note, category, amount, transaction_type, account_id, to_account_id, created_at"
        )
        .single();
      if (error || !data) return err(error?.message ?? "Insert failed");
      return ok({ transaction: data });
    }
  );

  server.registerTool(
    "update_transaction",
    {
      description: "Update any subset of a transaction's fields.",
      inputSchema: {
        transaction_id: z.string().uuid(),
        transaction_date: ISO_DATE.optional(),
        account_id: z.string().uuid().optional(),
        category: z.string().min(1).max(512).optional(),
        amount: POSITIVE_MONEY.optional(),
        transaction_type: z.enum(["income", "expense", "transfer"]).optional(),
        note: z.string().max(4000).nullable().optional(),
        description: z.string().max(4000).nullable().optional(),
        to_account_id: z.string().uuid().nullable().optional(),
      },
    },
    async ({ transaction_id, ...fields }) => {
      const { data: existing } = await supabase
        .from("transactions")
        .select(
          "port_id, account_id, to_account_id, transaction_type"
        )
        .eq("transaction_id", transaction_id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");

      const merged = {
        account_id: fields.account_id ?? existing.account_id,
        to_account_id:
          fields.to_account_id !== undefined
            ? fields.to_account_id
            : existing.to_account_id,
        transaction_type: fields.transaction_type ?? existing.transaction_type,
      };
      if (merged.transaction_type === "transfer") {
        if (!merged.to_account_id)
          return err("Transfers require to_account_id");
        if (merged.account_id === merged.to_account_id)
          return err("from and to accounts must differ");
      }

      const { data: a1 } = await supabase
        .from("accounts")
        .select("port_id")
        .eq("account_id", merged.account_id)
        .maybeSingle();
      if (!a1 || a1.port_id !== port_id)
        return err("account_id not in this portfolio");
      if (merged.transaction_type === "transfer" && merged.to_account_id) {
        const { data: a2 } = await supabase
          .from("accounts")
          .select("port_id")
          .eq("account_id", merged.to_account_id)
          .maybeSingle();
        if (!a2 || a2.port_id !== port_id)
          return err("to_account_id not in this portfolio");
      }

      const patch: Record<string, unknown> = {};
      if (fields.transaction_date !== undefined)
        patch.transaction_date = txDateToIso(fields.transaction_date);
      if (fields.category !== undefined) patch.category = fields.category.trim();
      if (fields.amount !== undefined) patch.amount = fields.amount;
      if (fields.note !== undefined) patch.note = fields.note?.trim() || null;
      if (fields.description !== undefined)
        patch.description = fields.description?.trim() || null;
      if (fields.account_id !== undefined) patch.account_id = fields.account_id;
      if (fields.transaction_type !== undefined)
        patch.transaction_type = fields.transaction_type;
      if (
        fields.transaction_type === "income" ||
        fields.transaction_type === "expense"
      ) {
        patch.to_account_id = null;
      } else if (fields.to_account_id !== undefined) {
        patch.to_account_id = fields.to_account_id;
      }

      if (Object.keys(patch).length === 0) return err("No fields to update");

      const { data, error } = await supabase
        .from("transactions")
        .update(patch)
        .eq("transaction_id", transaction_id)
        .select(
          "transaction_id, transaction_date, description, note, category, amount, transaction_type, account_id, to_account_id, created_at"
        )
        .single();
      if (error || !data) return err(error?.message ?? "Update failed");
      return ok({ transaction: data });
    }
  );

  server.registerTool(
    "delete_transaction",
    {
      description: "Delete a transaction by id.",
      inputSchema: { transaction_id: z.string().uuid() },
    },
    async ({ transaction_id }) => {
      const { data: existing } = await supabase
        .from("transactions")
        .select("port_id")
        .eq("transaction_id", transaction_id)
        .maybeSingle();
      if (!existing || existing.port_id !== port_id) return err("Not found");
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("transaction_id", transaction_id);
      if (error) return err(error.message);
      return ok({ deleted: transaction_id });
    }
  );

  // ---------- reporting ----------

  server.registerTool(
    "get_month_stats",
    {
      description:
        "Income and expense totals for a calendar month, plus rollups by category. Transfers excluded.",
      inputSchema: { month: YEAR_MONTH },
    },
    async ({ month }) => {
      const bounds = monthBoundsUtc(month);
      if (!bounds) return err("Invalid month (use YYYY-MM)");
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "transaction_id, transaction_date, description, note, category, amount, transaction_type, account_id, to_account_id"
        )
        .eq("port_id", port_id)
        .gte("transaction_date", bounds.start)
        .lte("transaction_date", bounds.end)
        .order("transaction_date", { ascending: false })
        .limit(20000);
      if (error) return err(error.message);
      const txs = (data ?? []) as LedgerTx[];
      const { income, expense } = monthIncomeExpense(txs);
      return ok({
        month,
        income_total: income,
        expense_total: expense,
        net: income - expense,
        income_by_category: rollupByCategory(txs, "income"),
        expense_by_category: rollupByCategory(txs, "expense"),
        row_count: txs.length,
      });
    }
  );

  server.registerTool(
    "get_portfolio_summary",
    {
      description:
        "Counts of accounts, groups, categories, and transactions in this portfolio.",
      inputSchema: {},
    },
    async () => {
      const [accRes, grpRes, catRes, txRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("account_id", { count: "exact", head: true })
          .eq("port_id", port_id),
        supabase
          .from("account_groups")
          .select("group_id", { count: "exact", head: true })
          .eq("port_id", port_id),
        supabase
          .from("categories")
          .select("id", { count: "exact", head: true })
          .eq("port_id", port_id),
        supabase
          .from("transactions")
          .select("transaction_id", { count: "exact", head: true })
          .eq("port_id", port_id),
      ]);
      return ok({
        port_id,
        accounts: accRes.count ?? 0,
        account_groups: grpRes.count ?? 0,
        categories: catRes.count ?? 0,
        transactions: txRes.count ?? 0,
      });
    }
  );

  return server;
}
