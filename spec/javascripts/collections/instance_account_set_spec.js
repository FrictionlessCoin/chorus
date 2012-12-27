describe("chorus.collections.InstanceAccountSet", function() {
    beforeEach(function() {
        this.accountSet = new chorus.collections.InstanceAccountSet([], {instanceId: '1'});
    });

    describe("#users", function() {
        beforeEach(function() {
            this.accountSet.reset([
                rspecFixtures.instanceAccount({ owner: { id: '1', firstName: 'barnie', lastName: 'rubble' } }),
                rspecFixtures.instanceAccount({ owner: { id: '2', firstName: 'fred', lastName: 'flinstone' } })
            ]);
            this.users = this.accountSet.users();
        });

        it("returns an array of users", function() {
            expect(this.users.length).toBe(2);
        });

        it("builds user models with the 'user' attribute of the accounts", function() {
            expect(this.users[0].get("id")).toBe("2");
            expect(this.users[0].get("firstName")).toBe("fred");
            expect(this.users[0].get("lastName")).toBe("flinstone");

            expect(this.users[1].get("id")).toBe("1");
            expect(this.users[1].get("firstName")).toBe("barnie");
            expect(this.users[1].get("lastName")).toBe("rubble");
        });

        context("when there are no models in the collection", function() {
            beforeEach(function() {
                this.accountSet.reset();
                this.users = this.accountSet.users();
            });

            it("returns an empty array", function() {
                expect(this.users.length).toBe(0);
            });
        });
    });

    describe("#url", function() {
        it("has the instanceId param", function() {
            var uri = new URI(this.accountSet.url());
            expect(uri.path()).toMatchUrl("/gpdb_instances/1/members");
        });
    });

    describe("sort", function() {
        beforeEach(function() {
            this.accountSet.reset([
                rspecFixtures.instanceAccount({ owner: { firstName: 'fred', lastName: 'zzz' } }),
                rspecFixtures.instanceAccount({ owner: { firstName: 'barnie', lastName: 'zzz' } }),
                rspecFixtures.instanceAccount({ owner: { firstName: 'sammy', lastName: 'aaa' } })
            ]);
        });
        it("sorts by last name, and first name", function() {
            var userNames = this.accountSet.map(function(account) {
                return account.user().get('firstName');
            });
            expect(userNames).toEqual(['sammy', 'barnie', 'fred']);
        });
    });

    describe("persistedAccountCount", function() {
        context("when all of the accounts are persisted", function() {
            beforeEach(function() {
                this.accountSet.reset([
                    rspecFixtures.instanceAccount({ owner: { id: '1', firstName: 'barnie', lastName: 'rubble' } }),
                    rspecFixtures.instanceAccount({ owner: { id: '2', firstName: 'fred', lastName: 'flinstone' } })
                ]);
            });

            it("should be the full length", function() {
                expect(this.accountSet.persistedAccountCount()).toEqual(2);
            });
        });

        context("when some of the accounts are not persisted", function() {
            beforeEach(function() {
                this.accountSet.reset([
                    rspecFixtures.instanceAccount({ owner: { id: '1', firstName: 'barnie', lastName: 'rubble' } }),
                    rspecFixtures.instanceAccount({ owner: { id: '2', firstName: 'fred', lastName: 'flinstone' } }),
                    rspecFixtures.instanceAccount({ id: null, owner: { id: '3', firstName: 'wilma', lastName: 'flinstone' } })
                ]);
            });

            it("should not include non-persisted accounts", function() {
                expect(this.accountSet.persistedAccountCount()).toEqual(2);
            });
        });

        context("when none of the accounts are persisted", function() {
            beforeEach(function() {
                this.accountSet.reset([
                    rspecFixtures.instanceAccount({ id: null, owner: { id: '1', firstName: 'barnie', lastName: 'rubble' } }),
                    rspecFixtures.instanceAccount({ id: null, owner: { id: '2', firstName: 'fred', lastName: 'flinstone' } }),
                    rspecFixtures.instanceAccount({ id: null, owner: { id: '3', firstName: 'wilma', lastName: 'flinstone' } })
                ]);
            });

            it("should not include non-persisted accounts", function() {
                expect(this.accountSet.persistedAccountCount()).toEqual(0);
            });
        });
    });
});
