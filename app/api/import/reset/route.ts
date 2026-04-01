import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const CONFIRM_PHRASE = 'DELETE_PORTFOLIO_TRANSACTIONS_AND_ACCOUNTS';

const bodySchema = z.object({
  port_id: z.string().uuid(),
  confirm: z.literal(CONFIRM_PHRASE),
  secret: z.string().optional(),
});

/**
 * Deletes transactions, MM-import extras (tags, budgets, templates, portfolio_kv),
 * then accounts and account_groups for one portfolio.
 * Categories and the portfolio row are kept.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envSecret = process.env.RESET_FINANCIAL_DATA_SECRET?.trim();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Confirmation mismatch. Send JSON { "port_id": "<uuid>", "confirm": "${CONFIRM_PHRASE}" } exactly.`,
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  if (envSecret && parsed.data.secret !== envSecret) {
    return NextResponse.json(
      {
        error:
          'RESET_FINANCIAL_DATA_SECRET is set but the request body omitted the correct "secret" field.',
      },
      { status: 403 }
    );
  }

  const { port_id } = parsed.data;

  const { data: portfolio, error: portErr } = await supabase
    .from('portfolio')
    .select('user_id')
    .eq('port_id', port_id)
    .maybeSingle();

  if (portErr || !portfolio || portfolio.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Portfolio not found or access denied.' },
      { status: 403 }
    );
  }

  const errors: string[] = [];

  const { error: txErr } = await supabase
    .from('transactions')
    .delete()
    .eq('port_id', port_id);
  if (txErr) errors.push(`transactions: ${txErr.message}`);

  const { error: tagsErr } = await supabase
    .from('tags')
    .delete()
    .eq('port_id', port_id);
  if (tagsErr) errors.push(`tags: ${tagsErr.message}`);

  const { error: budErr } = await supabase
    .from('budgets')
    .delete()
    .eq('port_id', port_id);
  if (budErr) errors.push(`budgets: ${budErr.message}`);

  const { error: recErr } = await supabase
    .from('recurring_templates')
    .delete()
    .eq('port_id', port_id);
  if (recErr) errors.push(`recurring_templates: ${recErr.message}`);

  const { error: favErr } = await supabase
    .from('favorite_templates')
    .delete()
    .eq('port_id', port_id);
  if (favErr) errors.push(`favorite_templates: ${favErr.message}`);

  const { error: kvErr } = await supabase
    .from('portfolio_kv')
    .delete()
    .eq('port_id', port_id);
  if (kvErr) errors.push(`portfolio_kv: ${kvErr.message}`);

  const { error: accErr } = await supabase
    .from('accounts')
    .delete()
    .eq('port_id', port_id);
  if (accErr) errors.push(`accounts: ${accErr.message}`);

  const { error: grpErr } = await supabase
    .from('account_groups')
    .delete()
    .eq('port_id', port_id);
  if (grpErr) errors.push(`account_groups: ${grpErr.message}`);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Some delete steps failed.', partialErrors: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      'Removed all transactions, tags, budgets, recurring/favorite templates, imported settings (portfolio_kv), accounts, and account groups for this portfolio. The portfolio and categories were not deleted.',
  });
}
