-- Mock analytics data for designing the Analytics page.
--
-- Creates one "Analytics demo" workspace (fixed id below) owned by the given
-- user, with six fake channels, ~60 published posts over the last 90 days,
-- current metrics on each and a history of readings over time.
--
-- Safe by construction: channels have no tokens and targets have no
-- platform_post_id, so the publisher and metrics collector never touch them.
-- Re-running wipes and rebuilds only this workspace.
--
--   psql "$DATABASE_URL" -v owner=<auth user id> -f scripts/analytics-demo.sql
--   psql "$DATABASE_URL" -f scripts/analytics-demo-remove.sql   (to delete it)

\set ON_ERROR_STOP on
begin;

delete from orgs where id = 'd3d0a000-0000-4000-8000-000000000001';

insert into orgs (id, name, plan, comped, onboarded_at)
values ('d3d0a000-0000-4000-8000-000000000001', 'Analytics demo', 'creator', true, now());

insert into org_members (org_id, user_id, role)
values ('d3d0a000-0000-4000-8000-000000000001', :'owner', 'owner');

insert into channels (id, org_id, platform, handle, display_name, status, created_at) values
  ('d3d0a000-0000-4000-8000-0000000000c1', 'd3d0a000-0000-4000-8000-000000000001', 'x',        'haldencoffee',                'Halden Coffee', 'active', now() - interval '95 days'),
  ('d3d0a000-0000-4000-8000-0000000000c2', 'd3d0a000-0000-4000-8000-000000000001', 'linkedin', 'halden-coffee',               'Halden Coffee', 'active', now() - interval '95 days'),
  ('d3d0a000-0000-4000-8000-0000000000c3', 'd3d0a000-0000-4000-8000-000000000001', 'bluesky',  'haldencoffee.bsky.social',    'Halden Coffee', 'active', now() - interval '95 days'),
  ('d3d0a000-0000-4000-8000-0000000000c4', 'd3d0a000-0000-4000-8000-000000000001', 'mastodon', 'haldencoffee@mastodon.social','Halden Coffee', 'active', now() - interval '95 days'),
  ('d3d0a000-0000-4000-8000-0000000000c5', 'd3d0a000-0000-4000-8000-000000000001', 'tiktok',   'haldencoffee',                'Halden Coffee', 'active', now() - interval '95 days'),
  ('d3d0a000-0000-4000-8000-0000000000c6', 'd3d0a000-0000-4000-8000-000000000001', 'youtube',  'HaldenCoffee',                'Halden Coffee', 'active', now() - interval '95 days');

do $$
declare
  org constant uuid := 'd3d0a000-0000-4000-8000-000000000001';
  bodies text[] := array[
    'New single origin just landed: Ethiopia Guji, washed. Notes of peach and jasmine.',
    'How we dial in espresso every morning, in 60 seconds.',
    'Our cold brew ratio, since three of you asked this week: 1:8, 18 hours, coarse grind.',
    'Saturday cupping is back. Free, 10am, bring a friend.',
    'We''re hiring a weekend barista in Leeds. Coffee knowledge helps, kindness matters more.',
    'Behind the roaster: why we pull our light roasts 20 seconds earlier than most.',
    'Oat, almond or whole? We blind-tested every milk with our house espresso.',
    'Three mistakes that make home pour-over bitter, and the fixes.',
    'Meet Ama, who has run our morning shift for four years.',
    'Decaf that tastes like coffee. Swiss Water process, Colombian beans.',
    'The story behind our new cups: compostable, and they don''t go soggy.',
    'Rainy day special: any filter coffee with a cardamom bun for 5.',
    'What a coffee farm visit actually looks like. Honduras, week one.',
    'We roast on Tuesdays and Fridays. Here''s why freshness peaks at day 7.',
    'Latte art fail compilation. We''re only human.',
    'Grinder settings for every brew method, on one card. Save this.',
    'Our subscription now ships every two weeks. Pause any time.',
    'Tasting notes are not flavourings. A short explainer.',
    'Five years of Halden. Thank you for every single cup.',
    'Iced shaken espresso is back on the menu for the heatwave.'
  ];
  -- Per-network reach and engagement shape: [impressions base, like rate, comment rate, share rate, save rate]
  plats text[] := array['x','linkedin','bluesky','mastodon','tiktok','youtube'];
  chans uuid[] := array[
    'd3d0a000-0000-4000-8000-0000000000c1','d3d0a000-0000-4000-8000-0000000000c2','d3d0a000-0000-4000-8000-0000000000c3',
    'd3d0a000-0000-4000-8000-0000000000c4','d3d0a000-0000-4000-8000-0000000000c5','d3d0a000-0000-4000-8000-0000000000c6'
  ]::uuid[];
  base int[] := array[1800, 900, 0, 0, 6500, 2400];
  like_r numeric[] := array[0.030, 0.022, 0, 0, 0.060, 0.045];
  -- Networks without impressions: absolute like scale instead.
  like_abs int[] := array[0, 0, 45, 30, 0, 0];
  -- How far through its final numbers a post is at each reading.
  ages interval[] := array['1 hour','6 hours','1 day','3 days','7 days','14 days']::interval[];
  fracs numeric[] := array[0.12, 0.40, 0.68, 0.87, 0.97, 1.0];
  i int; j int; k int; s int; n int;
  post_id uuid; target_id uuid; at timestamptz;
  boost numeric; imp int; likes int; comments int; shares int; saves int;
  m jsonb; mk jsonb; f numeric;
begin
  perform setseed(0.42);
  for i in 1..60 loop
    -- Spread over 90 days, mostly weekday mornings, a little random.
    at := date_trunc('day', now() - make_interval(days => (90 - i * 1.5)::int))
          + make_interval(hours => 8 + floor(random() * 10)::int, mins => (floor(random() * 4) * 15)::int);
    if at > now() - interval '2 hours' then at := now() - interval '2 hours'; end if;
    post_id := gen_random_uuid();
    insert into posts (id, org_id, body, scheduled_at, status, created_at)
    values (post_id, org, bodies[1 + (i % array_length(bodies, 1))], at, 'published', at - interval '1 day');

    -- Each post goes to 2-4 networks; later posts do a bit better (growth).
    n := 2 + floor(random() * 3)::int;
    boost := 0.6 + (i / 60.0) * 0.8 + (case when random() < 0.08 then 3 else 0 end); -- the odd hit
    for k in 1..n loop
      j := 1 + ((i + k * 2) % 6);
      target_id := gen_random_uuid();
      imp := case when base[j] > 0 then round(base[j] * boost * (0.5 + random()))::int else null end;
      likes := case when imp is not null then round(imp * like_r[j] * (0.6 + random() * 0.8))::int
                    else round(like_abs[j] * boost * (0.5 + random()))::int end;
      comments := greatest(0, round(likes * (case plats[j] when 'linkedin' then 0.35 when 'youtube' then 0.12 else 0.08 end) * (0.5 + random()))::int);
      shares := case when plats[j] = 'linkedin' then round(likes * 0.05)::int else round(likes * 0.18 * (0.5 + random()))::int end;
      saves := case when plats[j] in ('x','tiktok') then round(likes * 0.1 * random())::int else null end;

      m := jsonb_strip_nulls(jsonb_build_object('impressions', imp, 'likes', likes, 'comments', comments, 'shares', shares, 'saves', saves));
      insert into post_targets (id, post_id, channel_id, status, metrics, metrics_updated_at)
      values (target_id, post_id, chans[j], 'published', m, least(now(), at + interval '14 days'));

      -- History: readings along the growth curve, only those already in the past.
      for s in 1..array_length(ages, 1) loop
        exit when at + ages[s] > now();
        f := fracs[s];
        select jsonb_object_agg(key, round((value::text)::numeric * f)) into mk from jsonb_each(m);
        insert into post_metric_snapshots (org_id, target_id, channel_id, platform, captured_at, metrics)
        values (org, target_id, chans[j], plats[j], at + ages[s], mk);
      end loop;
    end loop;
  end loop;
end $$;

commit;

select
  (select count(*) from posts where org_id = 'd3d0a000-0000-4000-8000-000000000001') as posts,
  (select count(*) from post_targets t join posts p on p.id = t.post_id where p.org_id = 'd3d0a000-0000-4000-8000-000000000001') as targets,
  (select count(*) from post_metric_snapshots where org_id = 'd3d0a000-0000-4000-8000-000000000001') as readings;
