class Hdfs::FilesController < ApplicationController
  def index
    if params[:id]
      hdfs_entries = HdfsEntry.where(:parent_id => params[:id])
      present hdfs_entries, :presenter_options => {:deep => true}
    else
      hdfs_entry = HdfsEntry.find_by_path_and_hadoop_instance_id('/', hadoop_instance.id)
      present hdfs_entry, :presenter_options => {:deep => true}
    end
  end

  def show
    hdfs_entry = HdfsEntry.find(params[:id])
    present hdfs_entry, :presenter_options => {:deep => true}
  end

  private

  def hadoop_instance
    @hadoop_instance ||= HadoopInstance.find(params[:hadoop_instance_id])
  end
end
