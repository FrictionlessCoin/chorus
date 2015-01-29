json.id event.id
json.partial! 'shared/user', user: user, title: 'actor'
json.action 'NOTE'
json.timestamp event.updated_at
if event.workspace != nil
  json.partial! 'shared/workspace', workspace: event.workspace, user: user
end
if event.additional_data && event.additional_data["body"]
  json.body event.additional_data["body"]
end
json.action_type event.action
json.attachments nil
json.comments do
  json.array! event.comments do |comment|
    json.partial! 'shared/comment', comment: comment, user: comment.author
  end
end
json.is_insight event.insight
json.promoted_by do
  json.id user.id
  json.username user.username
  json.first_name user.first_name
  json.last_name user.last_name
  json.image do
    if user.image_file_name == nil
      json.original '/images/general/default-user.png'
      json.icon  '/images/general/default-user.png'
    else
      json.original user.image_file_name
      json.icon user.image_file_name
    end
    if user.image_content_type == nil
      json.entity_type 'image'
    else
      json.entity_type user.image_content_type
    end
  end
end
json.promotion_time event.promotion_time
json.is_published event.published
json.complete_json true

