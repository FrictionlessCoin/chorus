json.set! title do
  json.id user.id
  json.username user.username
  json.first_name user.first_name
  json.last_name  user.last_name
  json.image do
    if user.image_file_name == nil
      json.original '/images/default-user.png'
      json.icon  '/images/default-user.png'
    else
      json.original user.image.url(:original)
      json.icon user.image.url(:icon)
    end
    if user.image_content_type == nil
      json.entity_type 'image'
    else
      json.entity_type user.image_content_type
    end
    json.complete_json true
  end
  json.entity_type "user"
  json.is_deleted false
end