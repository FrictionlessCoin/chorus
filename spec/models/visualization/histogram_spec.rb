require 'spec_helper'

describe Visualization::Histogram do
  let(:schema) { FactoryGirl.build_stubbed(:gpdb_schema, :name => 'analytics') }
  let(:dataset) { FactoryGirl.build_stubbed(:gpdb_table, :name => '2009_sfo_customer_survey', :schema => schema) }
  let(:instance_account) { FactoryGirl.build_stubbed(:instance_account) }
  let(:connection) {
    object = Object.new
    stub(schema).connect_with(instance_account) { object }
    object
  }

  describe "#fetch!" do
    it "returns visualization structure" do
      visualization = described_class.new(dataset, {
          :bins => 3,
          :x_axis => 'airport_cleanliness'
      })

      mock(SqlExecutor).execute_sql(visualization.build_min_max_sql, connection, schema, 17) do
        GreenplumSqlResult.new.tap do |result|
          result.add_column("min", "double")
          result.add_column("max", "double")
          result.add_rows([['1.0', '9.0']])
        end
      end

      visualization.instance_variable_set(:@min, "1.0")
      visualization.instance_variable_set(:@max, "9.0")
      mock(SqlExecutor).execute_sql(visualization.build_row_sql, connection, schema, 17) do
        GreenplumSqlResult.new.tap do |result|
          result.add_column("bin", "text")
          result.add_column("frequency", "int8")
          result.add_rows([
            ['1', '2'],
            ['3', '6'],
            ['4', '9']
          ])
        end
      end

      visualization.fetch!(instance_account, 17)

      visualization.rows.should include({:bin => [1.0, 3.7], :frequency => 2})
      visualization.rows.should include({:bin => [3.7, 6.3], :frequency => 0})
      visualization.rows.should include({:bin => [6.3, 9.0], :frequency => 15})
    end
  end

  context "integration", :greenplum_integration do
    let(:account) { GreenplumIntegration.real_account }
    let(:database) { GpdbDatabase.find_by_name_and_data_source_id(GreenplumIntegration.database_name, GreenplumIntegration.real_data_source)}
    let(:dataset) { database.find_dataset_in_schema('base_table1', 'test_schema') }

    let(:visualization) do
      Visualization::Histogram.new(dataset, {
          :bins => 2,
          :x_axis => 'column1',
          :filters => filters
      })
    end

    describe "#fetch!" do
      before do
        visualization.fetch!(account, 12345)
      end

      context 'dataset is a chorus view' do
        let(:dataset) { datasets(:executable_chorus_view) }

        context 'with no filter' do
          let(:filters) { nil }

          it 'fetches the data' do
            visualization.rows.should == [
                {:bin => [0, 0.5], :frequency => 3},
                {:bin => [0.5, 1.0], :frequency => 6}
            ]
          end
        end

        context 'with a filter' do
          let(:filters) { ['"CHORUS_VIEW"."category" = \'papaya\''] }

          it 'fetches the data' do
            visualization.rows.should == [
                {:bin => [0, 0.5], :frequency => 1},
                {:bin => [0.5, 1.0], :frequency => 3}
            ]
          end
        end
      end

      context 'dataset is a table' do
        context "with no filter" do
          let(:filters) { nil }

          it "returns the frequency data" do
            visualization.rows.should == [
                {:bin => [0, 0.5], :frequency => 3},
                {:bin => [0.5, 1.0], :frequency => 6}
            ]
          end
        end

        context "with filters" do
          let(:filters) { ['"base_table1"."category" = \'papaya\''] }

          it "returns the frequency data based on the filtered dataset" do
            visualization.rows.should == [
                {:bin => [0, 0.5], :frequency => 1},
                {:bin => [0.5, 1.0], :frequency => 3}
            ]
          end
        end
      end
    end
  end
end
