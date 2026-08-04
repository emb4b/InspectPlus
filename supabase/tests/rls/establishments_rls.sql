begin;

select plan(4);

-- After locking down GraphQL/REST exposure, establishments should not be
-- directly selectable by anon or authenticated users.
-- Access should go through controlled RPC functions such as pull_changes
-- and push_changes.

select is(
  has_table_privilege('anon', 'public.establishments', 'SELECT'),
  false,
  'anon cannot directly SELECT establishments'
);

select is(
  has_table_privilege('authenticated', 'public.establishments', 'SELECT'),
  false,
  'authenticated cannot directly SELECT establishments'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.pull_changes(bigint)',
    'EXECUTE'
  ),
  'authenticated can execute pull_changes'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.push_changes(jsonb)',
    'EXECUTE'
  ),
  'authenticated can execute push_changes'
);

select * from finish();

rollback;