class HadoopInstanceAccess < AdminFullAccess
  def edit?(hadoop_instance)
    hadoop_instance.owner == current_user
  end
end
