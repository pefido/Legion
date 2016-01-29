function MergeUtils(lru) {
    this.lru = lru;
    this.map = null;
    this.doc = null;
}

/**
 *
 * @param callback
 */
MergeUtils.prototype.initMap = function (callback) {
    var mergeUtils = this;
    realtimeUtils.load(this.ALRU.FileID_Merge.replace('/', ''),
        function (doc) {
            mergeUtils.doc = doc;
            mergeUtils.map = doc.getModel().getRoot().get('b2b_map');
            callback();
        }, function () {
            console.error("onFileInitialize: should have been done already!");
        }
    );
};

/**
 * Returns array of type {key.each: value}
 */
MergeUtils.prototype.newMapValuesFrom = function (oldV, newV, dataType, oid) {
    var newItems, created, newKeys, oldKeys, i, oldItems;
    switch (dataType) {
        case "B2B":
            oldItems = oldV[oid];
            if (!oldItems)oldItems = [];
            newItems = newV[oid];

            created = [];

            newKeys = Object.keys(newItems);
            oldKeys = Object.keys(oldItems);
            for (i = 0; i < newKeys.length; i++) {
                if (!newItems[newKeys[i]]) continue;
                if (oldKeys.indexOf(newKeys[i]) === -1) {
                    created[newKeys[i]] = newItems[newKeys[i]];
                } else {
                    if (JSON.stringify(newItems[newKeys[i]]) != JSON.stringify(oldItems[newKeys[i]])) {
                        created[newKeys[i]] = newItems[newKeys[i]];
                    }
                }

            }
            return created;
            break;
        case "gapi":

            var objectNew = this.getObjectFromRev(newV, oid);
            var objectOld = this.getObjectFromRev(oldV, oid);
            oldItems = objectOld.value;
            if (!oldItems)oldItems = [];

            oldKeys = Object.keys(objectOld.value);
            newKeys = Object.keys(objectNew.value);
            newItems = objectNew.value;

            created = [];
            for (i = 0; i < newKeys.length; i++) {
                if (!newItems[newKeys[i]]) continue;
                if (oldKeys.indexOf(newKeys[i]) === -1) {
                    created[newKeys[i]] = newItems[newKeys[i]];
                } else {
                    if (JSON.stringify(newItems[newKeys[i]]) != JSON.stringify(oldItems[newKeys[i]])) {
                        created[newKeys[i]] = newItems[newKeys[i]];
                    }
                }
            }
            return created;
            break;
    }
};

/**
 * Both arguments of type {key.each: value}. Returns first value(after changes).
 * @param values
 * @param except
 * @returns {Array}
 */
MergeUtils.prototype.exceptMapValuesFrom = function (values, except) {
    var exceptKeys = Object.keys(except);
    for (var i = 0; i < exceptKeys.length; i++) {
        values[exceptKeys[i]] = null;
        delete values[exceptKeys[i]];
    }
    return values;
};

/**
 * Returns array of type {key.each: value}
 */
MergeUtils.prototype.delMapValuesFrom = function (oldV, newV, dataType, oid) {
    var oldItems, deleted, newKeys, oldKeys, i;
    switch (dataType) {
        case "B2B":
            oldItems = oldV[oid];
            if (!oldItems)oldItems = [];
            var newItems = newV[oid];

            deleted = [];
            newKeys = Object.keys(newItems);
            oldKeys = Object.keys(oldItems);
            for (i = 0; i < oldKeys.length; i++) {
                if (!oldItems[oldKeys[i]]) continue;
                if (newKeys.indexOf(oldKeys[i]) === -1) {
                    deleted[oldKeys[i]] = oldItems[oldKeys[i]];
                }
            }
            //console.log(newKeys);
            //console.log(oldKeys);
            //console.log(deleted);
            return deleted;
            break;
        case "gapi":
            var objectNew = this.getObjectFromRev(newV, oid);
            var objectOld = this.getObjectFromRev(oldV, oid);

            oldKeys = Object.keys(objectOld.value);
            newKeys = Object.keys(objectNew.value);
            oldItems = objectOld.value;

            deleted = [];
            for (i = 0; i < oldKeys.length; i++) {
                if (!oldItems[oldKeys[i]]) continue;
                if (newKeys.indexOf(oldKeys[i]) === -1) {
                    deleted[oldKeys[i]] = oldItems[oldKeys[i]];
                }
            }
            //console.log(newKeys);
            //console.log(oldKeys);
            //console.log(deleted);
            return deleted;
            break;
    }
};

MergeUtils.prototype.getObjectFromRev = function (rev, oid) {
    var val = rev.result.data.value;
    var keys = Object.keys(val);
    for (var i = 0; i < keys.length; i++) {
        if (val[keys[i]].id && val[keys[i]].id == oid) {
            return val[keys[i]];
        }
    }
    console.error("No object.")
};

MergeUtils.prototype.mergeMapDiffsToRev = function (object, newVs, delVs) {
    var newKeys = Object.keys(newVs);
    var delKeys = Object.keys(delVs);
    //console.log(newKeys);
    //console.log(delKeys);

    for (var i = 0; i < newKeys.length; i++) {
        object.value[newKeys[i]] = {json: newVs[newKeys[i]]};
    }

    for (var j = 0; j < delKeys.length; j++) {
        object.value[delKeys[i]] = null;
    }
};

MergeUtils.prototype.mergeMapDiffsToB2B = function (oid, newVs, delVs) {
    var m = new ORMap(oid, ALru.objectStore, "dontchangecallbacks");
    var newKeys = Object.keys(newVs);
    var delKeys = Object.keys(delVs);
    //console.log(newKeys);
    //console.log(delKeys);

    for (var i = 0; i < newKeys.length; i++) {
        m.set(newKeys[i], newVs[newKeys[i]].json);
    }

    for (var j = 0; j < delKeys.length; j++) {
        m.remove(delKeys[i]);
    }
};

MergeUtils.prototype.eQUALS_ARRAY = function (arr1, arr2) {
    if (arr1.length != arr2.length)
        return false;
    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] != arr2[i])return false;
    }
    return true;
};

MergeUtils.prototype.mergeFiles = function () {
    var mergeUtils = this;
    var lru = this.lru;
    getCurrentRevision(lru.FileID_Original, function (revision) {
        lru.revisions.set(parseInt(revision.revision), revision);

        if (!mergeUtils.doc) {
            mergeUtils.initMap(function () {
                mergeUtils.mergeFiles();
            });
        } else {
            //TODO: am in here
            //console.log("mergeUtils: mergeFiles");
            var lastRev = mergeUtils.map.get("gapi");
            var lastB2b = mergeUtils.map.get("b2b");
            var lastRevNum = lastRev.num;

            var lastRevVal = lastRev.val;
            var lastB2BVal = lastB2b.val;

            var keys = lru.revisions.keys().sort();
            var currKey = keys[keys.length - 1];
            var revision = lru.revisions.get(currKey);
            if (currKey == lastRevNum) {
                revision = lastRevVal;
            }

            var currB2Bval = mergeUtils.getLocalValue();

            //console.log({Lb2bVal: lastB2BVal});
            //console.log({Cb2bVal: currB2Bval});

            //console.log({num: lastRevNum, val: lastRevVal});
            //console.log({num: currKey, val: revision});

            var currRootKey;
            var currRootObject;
            var rootKeys = Object.keys(revision.result.data.value);

            var update = false;
            for (var j = 0; j < rootKeys.length; j++) {
                currRootKey = rootKeys[j];
                currRootObject = revision.result.data.value[currRootKey];
                if (currRootObject.id) {
                    switch (currRootObject.type) {
                        case "Map":
                            console.info("AAAA - 1");
                            var B2BNew = mergeUtils.newMapValuesFrom(lastB2BVal, currB2Bval, "B2B", currRootObject.id);
                            var B2BDel = mergeUtils.delMapValuesFrom(lastB2BVal, currB2Bval, "B2B", currRootObject.id);

                            //console.info(B2BNew);
                            //console.info(B2BDel);

                            var gapiNew = mergeUtils.newMapValuesFrom(lastRevVal, revision, "gapi", currRootObject.id);
                            var gapiDel = mergeUtils.delMapValuesFrom(lastRevVal, revision, "gapi", currRootObject.id);

                            gapiDel = mergeUtils.exceptMapValuesFrom(gapiDel, B2BNew);
                            B2BNew = mergeUtils.exceptMapValuesFrom(B2BNew, gapiNew);
                            B2BDel = mergeUtils.exceptMapValuesFrom(B2BDel, gapiNew);

                            if (Object.keys(B2BNew).length > 0)
                                update = true;
                            if (Object.keys(B2BDel).length > 0)
                                update = true;
                            if (Object.keys(gapiNew).length > 0)
                                update = true;
                            if (Object.keys(gapiDel).length > 0)
                                update = true;

                            mergeUtils.mergeMapDiffsToRev(currRootObject, B2BNew, B2BDel);
                            mergeUtils.mergeMapDiffsToB2B(currRootObject.id, gapiNew, gapiDel);
                            console.info("AAAA - 2");
                            break;
                        case "List":
                            console.log("BBBB - 1");

                            var gapiList = currRootObject.value;
                            var NgapiList = [];
                            var b2bList = currB2Bval[currRootObject.id];
                            for (var i = 0; i < gapiList.length; i++) {
                                NgapiList[i] = gapiList[i]
                                if (gapiList[i].json) {
                                    NgapiList[i] = gapiList[i].json;
                                }
                            }
                            console.log("BBBB - A");
                            var originalList = mergeUtils.getObjectFromRev(lastRevVal, currRootObject.id).value;
                            var NoriginalList = [];

                            for (var i = 0; i < originalList.length; i++) {
                                NoriginalList[i] = originalList[i];
                                if (originalList[i].json)
                                    NoriginalList[i] = originalList[i].json;
                            }
                            console.log("BBBB - B");

                            //console.log(NgapiList);
                            //console.log(b2bList);
                            //console.log(NoriginalList);

                            var list_changes = Diff.diff3_merge(NgapiList, NoriginalList, b2bList);

                            //console.log(list_changes);
                            console.log("BBBB - C");

                            var finalList = [];
                            for (var oi = 0; oi < list_changes.length; oi++) {
                                var currOS = list_changes[oi];
                                if (currOS.ok) {
                                    if (currOS.ok.length > 0)
                                        finalList = finalList.concat(currOS.ok);
                                } else if (currOS.conflict) {
                                    if (currOS.conflict.a.length > 0) {
                                        if (!mergeUtils.eQUALS_ARRAY(finalList.slice(finalList.length - currOS.conflict.a.length), currOS.conflict.a)) {
                                            for (var ii = 0; ii < currOS.conflict.a.length; ii++) {
                                                var val = currOS.conflict.a[ii];
                                                if (((currOS.conflict.b.indexOf(val) == -1)) && (currOS.conflict.o.indexOf(val) >= 0)) {
                                                    finalList = finalList.concat([val]);
                                                }
                                            }
                                        }
                                    }
                                    if (currOS.conflict.b.length > 0)
                                        for (var ii = 0; ii < currOS.conflict.b.length; ii++) {
                                            var val = currOS.conflict.b[ii];
                                            if (((currOS.conflict.a.indexOf(val) == -1)) && (currOS.conflict.o.indexOf(val) >= 0)) {
                                                finalList = finalList.concat([val]);
                                            }
                                        }
                                } else {
                                    console.error("Nope.");
                                }
                            }
                            console.log("BBBB - D");
                            //console.log(finalList);
                            currRootObject.value = [];
                            for (var ni = 0; ni < finalList.length; ni++) {
                                update = true;
                                currRootObject.value[ni] = {json: finalList[ni]};
                            }
                            console.log("BBBB - E");

                            var b2bL = new OP_Treedoc(currRootObject.id, ALru.objectStore, "dontchangecallbacks");
                            var b2bC = Diff.diff_comm(b2bList, finalList);
                            var b2bPos = 0;
                            for (var b2bi = 0; b2bi < b2bC.length; b2bi++) {
                                var ti = b2bC[b2bi];
                                if (ti.common) {
                                    b2bPos += ti.common.length;
                                } else {
                                    for (var remi = 0; remi < ti.file1.length; remi++) {
                                        update = true;
                                        b2bL.remove(b2bPos);
                                    }
                                    for (var addi = 0; addi < ti.file2.length; addi++) {
                                        update = true;
                                        b2bL.insert(b2bPos++, ti.file2[addi]);
                                    }
                                }
                            }

                            console.log("BBBB - 2");
                            break;
                        case "EditableString":
                            console.error("Not implemented.");
                            break;
                    }
                } else {
                    console.error("Please don't.");
                }
            }

            if (update) {
                //console.log("Updating GAPI file. Past rev:" + lastRevNum);
                //console.log(revision.result.data);
                drive_realtime_file_put(mergeUtils.ALRU.FileID_Original, revision.result.data, currKey, function () {
                    //console.log("Updated GAPI file.");
                });
            }

            if (update) {
                //console.log("Change merge file state: b2b");
                var newB2BRev = {val: mergeUtils.getLocalValue()};
                mergeUtils.map.set("b2b", newB2BRev);
            }

            if (update) {
                //console.log("Change merge file state: gapi");
                var newGapiRev = {num: currKey, val: revision};
                mergeUtils.map.set("gapi", newGapiRev);
            }
        }
    });
};

/**
 * Returns a JSON representation of the local objects.
 * (self contained function)
 * @returns {Object}
 */
MergeUtils.prototype.getLocalValue = function () {
    var val = {};
    var elems = this.lru.objectStore.getCRDT("RootMap");
    var keys = elems.keys();
    if (keys.length == 0) {
        console.error("Empty map.");
    } else {
        for (var i = 0; i < keys.length; i++) {
            var crdt = this.lru.objectStore.getCRDT(keys[i]);
            switch (crdt.crdt.type) {
                case CRDT_LIB.OP_ORMap.type:
                    val[keys[i]] = crdt.getValue();
                    break;
                case CRDT_LIB.OP_List.type:
                    val[keys[i]] = crdt.getValue();
                    break;
            }
        }
    }
    return val;
};