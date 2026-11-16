import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const recordFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    requestId: z.string().uuid(), feeId: z.string().uuid(),
    received: z.number().positive(), method: z.string().max(80), carry: z.boolean(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: fee, error } = await context.supabase.from("fees")
      .select("institute_id").eq("id", data.feeId).maybeSingle();
    if (error || !fee) throw new Error("Fee not found or inaccessible.");
    const { data: allowed, error: roleError } = await context.supabase.rpc("role_in_institute", {
      _institute_id: fee.institute_id, _roles: ["owner", "admin", "accountant", "receptionist"],
    });
    const { data: platformAdmin, error: platformError } = await context.supabase.rpc("is_superadmin");
    if (roleError || platformError || (!allowed && !platformAdmin)) throw new Error("Not allowed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error: paymentError } = await supabaseAdmin.rpc("collect_fee_payment_atomic_server", {
      _actor: context.userId, _request_id: data.requestId, _fee_id: data.feeId,
      _received: data.received, _method: data.method, _carry: data.carry,
    });
    if (paymentError) throw new Error(paymentError.message);
    return result;
  });