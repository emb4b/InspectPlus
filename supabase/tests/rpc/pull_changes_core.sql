begin;

select plan(1);

select ok(
  (public.pull_changes(0) ? 'changes'),
  'pull_changes returns changes key'
);

select * from finish();

rollback;