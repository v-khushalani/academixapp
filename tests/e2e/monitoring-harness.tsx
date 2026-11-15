import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../../src/integrations/supabase/client";
import { userRolesApi, batchesApi, studentsApi, feesApi } from "../../src/lib/api";
import { AdmissionForm } from "../../src/components/app/admission-form";
import { WalkInDialog } from "../../src/components/app/walk-in-dialog";
import { rememberInvite, resolvePostAuthDestination } from "../../src/lib/post-auth";

export { React, createRoot, QueryClient, QueryClientProvider, supabase, userRolesApi, AdmissionForm, WalkInDialog, rememberInvite, resolvePostAuthDestination, batchesApi, studentsApi, feesApi };