begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Provisions the `attachments` Storage bucket on the hosted project (the
-- matching [storage.buckets.attachments] block in supabase/config.toml only
-- affects the local dev stack, not this). Private bucket — every read goes
-- through an on-demand signed URL (see attachmentUploadQueue.ts's
-- getDisplayUri), never a public URL.
--
-- Own-object access (insert/update/delete/select) is authorized by PATH
-- PREFIX — (storage.foldername(name))[1] = auth.uid() — not by joining to
-- the public.attachments row, deliberately. The upload pipeline
-- (attachmentUploadQueue.ts) uploads the file BEFORE the metadata row ever
-- reaches this table (see watermelonAdapter.ts's getPendingRecords, which
-- withholds an attachment from push until uploadStatus = 'uploaded'), so at
-- INSERT time no public.attachments row with this storage_path exists yet
-- to join against — a row-based check here would make every upload fail.
-- Path-prefix matching is the standard Supabase pattern for this exact
-- situation and is safe as long as every path this app ever writes is
-- prefixed with the uploading inspector's own uid — see
-- attachmentUploadQueue.ts's path-building, which is the sole place that
-- invariant must hold.
--
-- Jurisdiction read access (another inspector in the same province viewing
-- an already-synced report's photos) has no such ordering problem — by the
-- time it matters, the attachments row necessarily already exists — so that
-- one DOES join through public.attachments, matching
-- add_jurisdiction_read_to_attachments.sql's row-level policy exactly.
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  52428800, -- 50MiB, matches supabase/config.toml's global file_size_limit
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "inspectors can manage own attachment objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "inspectors can read jurisdiction attachment objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attachments' and exists (
    select 1
    from public.attachments a
    left join public.inspection_reports ir on ir.report_id = a.inspection_report_id
    left join public.survey_reports sr on sr.survey_id = a.survey_report_id
    join public.establishments e on e.estab_id = coalesce(ir.estab_id, sr.estab_id)
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where a.storage_path = storage.objects.name
      and ua.province = e.province
  )
);

commit;
