-- Create view for posts with author info and engagement stats
create or replace view public.posts_with_details as
select 
  p.id,
  p.content,
  p.image_url,
  p.created_at,
  p.updated_at,
  pr.username as author_username,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  coalesce(l.like_count, 0) as like_count,
  coalesce(c.comment_count, 0) as comment_count
from public.posts p
join public.profiles pr on p.author_id = pr.id
left join (
  select post_id, count(*) as like_count
  from public.likes
  group by post_id
) l on p.id = l.post_id
left join (
  select post_id, count(*) as comment_count
  from public.comments
  group by post_id
) c on p.id = c.post_id
order by p.created_at desc;

-- Create view for user stats
create or replace view public.user_stats as
select 
  p.id,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.website,
  p.location,
  p.created_at,
  coalesce(posts.post_count, 0) as post_count,
  coalesce(followers.follower_count, 0) as follower_count,
  coalesce(following.following_count, 0) as following_count
from public.profiles p
left join (
  select author_id, count(*) as post_count
  from public.posts
  group by author_id
) posts on p.id = posts.author_id
left join (
  select following_id, count(*) as follower_count
  from public.follows
  group by following_id
) followers on p.id = followers.following_id
left join (
  select follower_id, count(*) as following_count
  from public.follows
  group by follower_id
) following on p.id = following.follower_id;
