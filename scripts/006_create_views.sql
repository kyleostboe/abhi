-- Create helpful views for the application

-- View for posts with author information and counts
CREATE OR REPLACE VIEW public.posts_with_details AS
SELECT 
  p.id,
  p.content,
  p.image_url,
  p.created_at,
  p.updated_at,
  pr.id as author_id,
  pr.username as author_username,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  COALESCE(like_counts.like_count, 0) as like_count,
  COALESCE(comment_counts.comment_count, 0) as comment_count
FROM public.posts p
JOIN public.profiles pr ON p.author_id = pr.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as like_count
  FROM public.likes
  GROUP BY post_id
) like_counts ON p.id = like_counts.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as comment_count
  FROM public.comments
  GROUP BY post_id
) comment_counts ON p.id = comment_counts.post_id
ORDER BY p.created_at DESC;

-- View for user profiles with follower/following counts
CREATE OR REPLACE VIEW public.profiles_with_counts AS
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.website,
  p.location,
  p.created_at,
  COALESCE(follower_counts.follower_count, 0) as follower_count,
  COALESCE(following_counts.following_count, 0) as following_count,
  COALESCE(post_counts.post_count, 0) as post_count
FROM public.profiles p
LEFT JOIN (
  SELECT following_id, COUNT(*) as follower_count
  FROM public.follows
  GROUP BY following_id
) follower_counts ON p.id = follower_counts.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) as following_count
  FROM public.follows
  GROUP BY follower_id
) following_counts ON p.id = following_counts.follower_id
LEFT JOIN (
  SELECT author_id, COUNT(*) as post_count
  FROM public.posts
  GROUP BY author_id
) post_counts ON p.id = post_counts.author_id;
