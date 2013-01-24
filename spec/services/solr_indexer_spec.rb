require 'spec_helper'

describe SolrIndexer do
  describe ".refresh_external_data" do
    it "refreshes all gpdb instances, all their databases, and all hadoop instances" do
      gpdb_data_source_count = 0
      any_instance_of(GpdbDataSource) do |instance|
        stub(instance).refresh_all(:mark_stale => true, :force_index => true) { gpdb_data_source_count += 1 }
      end

      hadoop_instance_count = 0
      any_instance_of(HadoopInstance) do |hadoop_instance|
        stub(hadoop_instance).refresh { hadoop_instance_count += 1 }
      end

      SolrIndexer.refresh_external_data

      gpdb_data_source_count.should == GpdbDataSource.count
      hadoop_instance_count.should == HadoopInstance.count
    end
  end

  describe ".reindex" do
    before do
      mock(Sunspot).commit
    end

    context "when passed one type to index" do
      it "should reindex datasets" do
        mock(Dataset).solr_reindex
        SolrIndexer.reindex('Dataset')
      end
    end

    context "when passed more than one type to index" do
      it "should index all types" do
        mock(Dataset).solr_reindex
        mock(GpdbDataSource).solr_reindex
        SolrIndexer.reindex(['Dataset', 'GpdbDataSource'])
      end
    end

    context "when told to index all indexable types" do
      it "should index all types" do
        Sunspot.searchable.each do |type|
          mock(type).solr_reindex
        end
        SolrIndexer.reindex('all')
      end
    end

    context "when passes an empty string" do
      it "should index nothing" do
        mock.proxy(SolrIndexer).types_to_index("") do |results|
          results.should be_empty
          results
        end
        SolrIndexer.reindex('')
      end
    end
  end

  describe ".refresh_and_reindex" do
    it "calls refresh, and passes the given models to reindex" do
      mock(SolrIndexer).refresh_external_data(false)
      mock(SolrIndexer).reindex("Model")
      SolrIndexer.refresh_and_reindex("Model")
    end
  end
end
