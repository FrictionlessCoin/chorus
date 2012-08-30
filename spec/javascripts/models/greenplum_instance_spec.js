describe("chorus.models.GreenplumInstance", function() {
    beforeEach(function() {
        this.instance = rspecFixtures.greenplumInstance({id: 1});
    });

    it("has the right entity type", function() {
        expect(this.instance.entityType).toBe("greenplum_instance");
    });

    it("has the right show url", function() {
        expect(this.instance.showUrl()).toBe("#/instances/1/databases");
    });

    it("has a valid url", function() {
        expect(this.instance.url()).toBe("/gpdb_instances/" + this.instance.get('id'));
    });

    describe(".aurora", function() {
        beforeEach(function() {
            this.aurora = chorus.models.GreenplumInstance.aurora();
        });

        it("returns a provisioning object", function() {
            expect(this.aurora).toBeA(chorus.models.Provisioning);
        });

        it("memoizes", function() {
            expect(this.aurora).toBe(chorus.models.GreenplumInstance.aurora());
        });
    });

    describe("#accountForUser", function() {
        beforeEach(function() {
            this.user = rspecFixtures.user();
            this.account = this.instance.accountForUser(this.user);
        });

        it("returns an InstanceAccount", function() {
            expect(this.account).toBeA(chorus.models.InstanceAccount);
        });

        it("sets the instance id", function() {
            expect(this.account.get("instanceId")).toBe(this.instance.get("id"));
        });

        it("sets the user id based on the given user", function() {
            expect(this.account.get("userId")).toBe(this.user.get("id"));
        });
    });

    describe("#accountForCurrentUser", function() {
        beforeEach(function() {
            this.currentUser = rspecFixtures.user();
            setLoggedInUser(this.currentUser.attributes);
        });

        it("memoizes", function() {
            var account = this.instance.accountForCurrentUser();
            expect(account).toBe(this.instance.accountForCurrentUser());
        });

        context("when the account is destroyed", function() {
            it("un-memoizes the account", function() {
                var previousAccount = this.instance.accountForCurrentUser();
                previousAccount.trigger("destroy");

                var account = this.instance.accountForCurrentUser();
                expect(account).not.toBe(previousAccount);
            });

            it("triggers 'change' on the instance", function() {
                spyOnEvent(this.instance, 'change');
                this.instance.accountForCurrentUser().trigger("destroy");
                expect("change").toHaveBeenTriggeredOn(this.instance);
            });
        });
    });

    describe("#accountForOwner", function() {
        beforeEach(function() {
            this.owner = this.instance.owner();
            this.accounts = rspecFixtures.instanceAccountSet();
            this.accounts.models[1].set({owner: this.owner.attributes});
            spyOn(this.instance, "accounts").andReturn(this.accounts);
        });

        it("returns the account for the owner", function() {
            expect(this.instance.accountForOwner()).toBeA(chorus.models.InstanceAccount);
            expect(this.instance.accountForOwner()).toBe(this.accounts.models[1]);
        });
    });

    describe("#accounts", function() {
        beforeEach(function() {
            this.instanceAccounts = this.instance.accounts();
        })

        it("returns an InstanceAccountSet", function() {
            expect(this.instanceAccounts).toBeA(chorus.collections.InstanceAccountSet)
        });

        it("sets the instance id", function() {
            expect(this.instanceAccounts.attributes.instanceId).toBe(this.instance.get('id'));
        });

        it("memoizes", function() {
            expect(this.instanceAccounts).toBe(this.instance.accounts());
        });
    });

    describe("#databases", function() {
        beforeEach(function() {
            this.databases = this.instance.databases();
        })

        it("returns an DatabaseSet", function() {
            expect(this.databases).toBeA(chorus.collections.DatabaseSet)
        });

        it("sets the instance id", function() {
            expect(this.databases.attributes.instanceId).toBe(this.instance.get('id'));
        });

        it("memoizes", function() {
            expect(this.databases).toBe(this.instance.databases());
        });
    });

    describe("#usage", function() {
        beforeEach(function() {
            this.instanceUsage = this.instance.usage();
        })

        it("returns an InstanceUsage object", function() {
            expect(this.instanceUsage).toBeA(chorus.models.InstanceUsage);
        });

        it("sets the instance id", function() {
            expect(this.instanceUsage.attributes.instanceId).toBe(this.instance.get('id'));
        });

        it("memoizes", function() {
            expect(this.instanceUsage).toBe(this.instance.usage());
        });
    })

    describe("#isGreenplum", function() {
        it("returns true for greenplum instances", function() {
            expect(this.instance.isGreenplum()).toBeTruthy();
        });
    });

    describe("validations", function() {
        context("with a registered instance", function() {
            beforeEach(function() {
                this.attrs = {
                    name: "foo",
                    host: "gillette",
                    dbUsername: "dude",
                    dbPassword: "whatever",
                    port: "1234",
                    maintenanceDb: "postgres",
                    provision_type: "register"
                }
            });

            context("when the instance is new", function() {
                beforeEach(function() {
                    this.instance.unset("id", { silent: true });
                });

                it("returns true when the model is valid", function() {
                    expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                })

                _.each(["name", "host", "dbUsername", "dbPassword", "port", "maintenanceDb"], function(attr) {
                    it("requires " + attr, function() {
                        this.attrs[attr] = "";
                        expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                        expect(this.instance.errors[attr]).toBeTruthy();
                    })
                });

                it("requires valid name", function() {
                    this.attrs.name = "foo bar"
                    expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                    expect(this.instance.errors.name).toMatchTranslation("instance.validation.name_pattern")
                })

                it("requires valid port", function() {
                    this.attrs.port = "z123"
                    expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                    expect(this.instance.errors.port).toBeTruthy();
                });
            });

            context("when the instance has already been created", function() {
                it("does not require a dbUsername or dbPassword", function() {
                    delete this.attrs.dbPassword;
                    delete this.attrs.dbUsername;
                    expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                });
            });
        });

        context("when creating a new instance", function() {
            beforeEach(function() {
                this.attrs = {
                    name: "foo",
                    size: "100000",
                    provision_type: "create",
                    databaseName: "thisDatabase",
                    schemaName: "thisSchema",
                    dbUsername: "foo",
                    dbPassword: "bar123"
                }
                spyOn(this.instance, "isNew").andReturn("true");
            });

            it("requires size", function() {
                this.attrs.size = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            })

            it("requires database name", function() {
                this.attrs.databaseName = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.databaseName).toBeTruthy();
            });

            it("requires schema name", function() {
                this.attrs.schemaName = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.schemaName).toBeTruthy();
            });

            it("requires instance name", function() {
                this.attrs.name = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.name).toBeTruthy();
            });

            it("requires a user name", function() {
                this.attrs.dbUsername = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.dbUsername).toBeTruthy();
            });

            it("requires a password", function() {
                this.attrs.dbPassword = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.dbPassword).toBeTruthy();
            });

            it("requires size to be less than the config's max provision size", function() {
                this.attrs.size = "200";

                chorus.models.Config.instance().set({provisionMaxSizeInGb: 500});
                expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                expect(this.instance.errors.size).toBeFalsy();

                chorus.models.Config.instance().set({provisionMaxSizeInGb: 100});
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            });
        });

        context("when editing a provisioned instance", function() {
            beforeEach(function() {
                this.attrs = {
                    name: "foo",
                    size: "1",
                    provision_type: "create",
                    databaseName: "thisDatabase",
                    schemaName: "thisSchema",
                    dbUsername: "foo",
                    dbPassword: "bar123"
                }
                spyOn(this.instance, "isNew").andReturn("false");
            });

            it("requires size", function() {
                this.attrs.size = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            })

            it("requires name", function() {
                this.attrs.name = "";
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.name).toBeTruthy();
            });

            it("requires nothing else", function() {
                this.attrs = {name: "foo", size: "1"}
                expect(this.instance.performValidation(this.attrs)).toBeTruthy();
            });

            it("requires size to be less than the config's max provision size", function() {
                this.attrs.size = "200";

                chorus.models.Config.instance().set({provisionMaxSizeInGb: 500});
                expect(this.instance.performValidation(this.attrs)).toBeTruthy();
                expect(this.instance.errors.size).toBeFalsy();

                chorus.models.Config.instance().set({provisionMaxSizeInGb: 100});
                expect(this.instance.performValidation(this.attrs)).toBeFalsy();
                expect(this.instance.errors.size).toBeTruthy();
            });
        });
    })

    describe("#hasWorkspaceUsageInfo", function() {
        it("returns true when the instance's usage is loaded", function() {
            this.instance.usage().set({workspaces: []});
            expect(this.instance.hasWorkspaceUsageInfo()).toBeTruthy();
        });

        it("returns false when the instances's usage is not loaded", function() {
            this.instance.usage().unset("workspaces");
            expect(this.instance.hasWorkspaceUsageInfo()).toBeFalsy();
        });
    });

    describe("#sharing", function() {
        it("returns an instance sharing model", function() {
            expect(this.instance.sharing().get("instanceId")).toBe(this.instance.get("id"));
        });

        it("caches the sharing model", function() {
            var originalModel = this.instance.sharing();
            expect(this.instance.sharing()).toBe(originalModel);
        });
    });

    describe("#sharedAccountDetails", function() {
        beforeEach(function() {
            this.owner = this.instance.owner();
            this.accounts = rspecFixtures.instanceAccountSet();
            this.accounts.models[1].set({owner: this.owner.attributes});
            spyOn(this.instance, "accounts").andReturn(this.accounts);
        });

        it("returns the account name of the user who owns the instance and shared it", function() {
            this.user = rspecFixtures.user();
            this.account = this.instance.accountForUser(this.user);
            expect(this.instance.sharedAccountDetails()).toBe(this.instance.accountForOwner().get("dbUsername"));
        });
    });

    describe("#providerIconUrl", function() {
        it("returns the right url for greenplum instances", function() {
            expect(this.instance.providerIconUrl()).toBe("/images/instances/greenplum_instance.png");
        });
    });
});
