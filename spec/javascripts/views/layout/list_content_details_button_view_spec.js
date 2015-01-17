describe("chorus.views.ListContentDetailsButtonView", function(){

	var createActionText = t("actions.create_workspace");


    beforeEach(function() {
        this.view = new chorus.views.ListContentDetailsButtonView({});
        this.view.options.buttons = [
            {
                view: "WorkspacesNew",
                text: createActionText,
                dataAttributes: [
                    {
                        name: "foo",
                        value: "bar"
                    }
                ]
            },
            {
                url: "#/foo",
                text: "Create a Foo"
            }
        ];
        this.view.render();
    });

    it("renders a button for each member of the buttons array", function(){
        expect(this.view.$('button[data-dialog="WorkspacesNew"]')).toExist();
        expect(this.view.$('button[data-dialog="WorkspacesNew"]').text()).toBe(createActionText);
        expect(this.view.$('button[data-dialog="WorkspacesNew"]')).toHaveData("foo", "bar");

        expect(this.view.$("a.button[href='#/foo']")).toExist();
        expect(this.view.$("a.button[href='#/foo']")).toContainText("Create a Foo");
    });
});