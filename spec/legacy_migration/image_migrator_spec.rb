require 'legacy_migration_spec_helper'
require 'base64'

TYPE_MAP = {
  "image/png" => "PNG",
  "image/jpeg" => "JPEG",
  "image/gif" => "GIF"
}

describe ImageMigrator do
  describe ".migrate" do
    describe "copying the data" do
      it "gives an image attachment to all users who had profile images" do
        legacy_users_with_images = Legacy.connection.select_all("select * from edc_user where image_id is not null")
        User.where("image_file_name is not null").count.should == legacy_users_with_images.length

        legacy_users_with_images.each do |legacy_user|
          new_user = User.find_by_legacy_id(legacy_user["id"])

          image_id = legacy_user["image_id"]
          image_instance_row = Legacy.connection.select_one("select * from edc_image_instance where image_id = '#{image_id}' and type = 'original'")
          image_row = Legacy.connection.select_one("select * from edc_image where id = '#{image_id}'")

          type = TYPE_MAP[image_row["type"]]
          width = image_instance_row["width"]
          height = image_instance_row["length"]

          g = Paperclip::Geometry.from_file(new_user.image.path(:original))
          g.width.should == width
          g.height.should == height
        end
      end

      it "gives an image attachment to all workspaces which had icons" do
        legacy_workspaces_with_images = Legacy.connection.select_all("select * from edc_workspace where icon_id is not null")
        Workspace.where("image_file_name is not null").count.should == legacy_workspaces_with_images.length

        legacy_workspaces_with_images.each do |legacy_workspace|
          new_workspace = Workspace.find_by_legacy_id(legacy_workspace["id"])

          icon_id = legacy_workspace["icon_id"]
          image_instance_row = Legacy.connection.select_one("select * from edc_image_instance where image_id = '#{icon_id}' and type = 'original'")
          image_row = Legacy.connection.select_one("select * from edc_image where id = '#{icon_id}'")

          type = TYPE_MAP[image_row["type"]]
          width = image_instance_row["width"]
          height = image_instance_row["length"]

          g = Paperclip::Geometry.from_file(new_workspace.image.path(:original))
          g.width.should == width
          g.height.should == height
        end
      end
    end
  end
end
