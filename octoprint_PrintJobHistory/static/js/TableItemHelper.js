/**
 * loadItemsFunction,
 * defaultPageSize,
 * defaultSortColumn,
 * defaultFilterName
 */
 function PrintJobTableItemHelper(loadItemsFunction, defaultPageSize, defaultSortColumn, defaultFilterName){

    var self = this;

    let isInBackground = true;
    const scheduledTasks = {
        _loadItems: undefined,
    };

    self.loadItemsFunction = loadItemsFunction;
    self.items = ko.observableArray([]);
    self.totalItemCount = ko.observable(0);
    self.currentItemCount = ko.observable(0);
    self.selectedTableItems = ko.observableArray();
    self.allSelectedCheckbox = ko.observable(false);    // checkbox

    // paging
    self.pageSizeOptions = ko.observableArray([10, 25, 50, 100, "all"])
    self.selectedPageSize = ko.observable(defaultPageSize)
    self.pageSize = ko.observable(self.selectedPageSize());
    self.currentPage = ko.observable(0);
    // Sorting
    self.sortColumn = ko.observable(defaultSortColumn);
    self.sortOrder = ko.observable("desc");
    // Filterinng
    self.filterOptions = ["all", "onlySuccess", "onlyFailed"];
    self.selectedFilterName = ko.observable(defaultFilterName);
    // Date
    self.queryStartDate = ko.observable(null);
    self.queryEndDate = ko.observable(null);
    self.searchQuery = ko.observable("")

    self.isInitialLoadDone = false;

    self.selectAll = function(checkedValue){
        if (checkedValue == false){
            self.selectedTableItems.removeAll();
        } else {
            self.selectedTableItems.removeAll();
            ko.utils.arrayPushAll(self.selectedTableItems, self.items());
        }
    }

    self.singleSelect = function(checkedValue){
        if (checkedValue == true){
            self.allSelectedCheckbox(true);
        } else {
            if (self.selectedTableItems().length == 0){
                self.allSelectedCheckbox(false);
            }
        }
    }

    // ############################################################################################### private functions
    self._loadItems = function() {
        const task = () => {
            var tableQuery = self.getTableQuery();
            self.loadItemsFunction( tableQuery, self.items, self.totalItemCount, self.currentItemCount );
        };

        if (!isInBackground) {
            task();

            return;
        }

        scheduledTasks._loadItems = task;
    }

    self.getTableQuery = function(){
        var from = Math.max(self.currentPage() * self.pageSize(), 0);
//        var to = Math.min(from + self.pageSize(), self.totalItemCount());
        var to = self.pageSize();
        if (to == 0){
            to = self.pageSize();
        }
        var tableQuery = {
            "from": from,
            "to": to,
            "sortColumn": self.sortColumn(),
            "sortOrder": self.sortOrder(),
            "filterName": self.selectedFilterName(),
            "startDate": self.queryStartDate() == null ? "" : self.queryStartDate(),
            "endDate": self.queryEndDate() == null ? "" : self.queryEndDate(),
            "searchQuery": self.searchQuery() == null ? "" : self.searchQuery(),
        };
        return tableQuery;
    }

    self.currentPage.subscribe(function(newPageIndex) {
        self._loadItems()
    });

    self.selectedPageSize.subscribe(function(newPageSize) {
        self.currentPage(0);
        if ("all" == newPageSize){
            self.pageSize(self.totalItemCount());
        } else {
            self.pageSize(newPageSize);
        }
        self._loadItems()
    });


    // ################################################################################################ public functions

    self.reloadItems = function(){
        self.allSelectedCheckbox(false);
        self.selectedTableItems.removeAll();
        self._loadItems();
    }


    self.toggleIsInBackground = (setIsInBackground) => {
        if (setIsInBackground === isInBackground) {
            return;
        }

        isInBackground = setIsInBackground;

        if (setIsInBackground) {
            return;
        }

        scheduledTasks._loadItems?.();
        scheduledTasks._loadItems = undefined;
    };


    self.paginatedItems = ko.dependentObservable(function() {
        if (self.items() === undefined) {
            return [];
        } else if (self.pageSize() === 0) {
            return self.items();
        } else {
            if (self.isInitialLoadDone == false){
                self.isInitialLoadDone = true;
                self._loadItems();
            }
            return self.items();
        }
    });
    // ############################################## SORTING
    self.changeSortOrder = function(newSortColumn){
        if (newSortColumn == self.sortColumn()){
            // toggle
            if ("desc" == self.sortOrder()){
                self.sortOrder("asc");
            } else {
               self.sortOrder("desc");
            }
        } else {
            self.sortColumn(newSortColumn);
            self.sortOrder("asc");
        }
        self.currentPage(0);
        self._loadItems();
    }

    self.sortOrderLabel = function(sortColumn){
        if (sortColumn == self.sortColumn()){
            // toggle
            if ("desc" == self.sortOrder()){
                return ("(descending)");
            } else {
               return ("(ascending)");
            }
        }
        return "";
    }

    // ############################################## FILTERING
    self.changeFilter = function(newFilterName) {
        self.selectedFilterName(newFilterName)
        self.currentPage(0);
        self._loadItems();
    };

    self.isFilterSelected = function(filterName) {
        return self.selectedFilterName() == filterName;
    };



    // ############################################## PAGING
    self.changePage = function(newPage) {
        if (newPage < 0 || newPage > self.lastPage())
            return;
        self.currentPage(newPage);
    };

    self.prevPage = function() {
        if (self.currentPage() > 0) {
            self.currentPage(self.currentPage() - 1);
        }
    };
    self.nextPage = function() {
        if (self.currentPage() < self.lastPage()) {
            self.currentPage(self.currentPage() + 1);
        }
    };
    self.lastPage = ko.dependentObservable(function() {
        return (self.pageSize() === 0 ? 1 :
                Math.ceil(self.totalItemCount() / self.pageSize()) - 1);
    });

   self.pages = ko.dependentObservable(function() {
        var pages = [];
        var i;

        if (self.pageSize() === 0) {
            pages.push({ number: 0, text: 1 });
        } else if (self.lastPage() < 7) {
            for (i = 0; i < self.lastPage() + 1; i++) {
                pages.push({ number: i, text: i+1 });
            }
        } else {
            pages.push({ number: 0, text: 1 });
            if (self.currentPage() < 5) {
                for (i = 1; i < 5; i++) {
                    pages.push({ number: i, text: i+1 });
                }
                pages.push({ number: -1, text: "…"});
            } else if (self.currentPage() > self.lastPage() - 5) {
                pages.push({ number: -1, text: "…"});
                for (i = self.lastPage() - 4; i < self.lastPage(); i++) {
                    pages.push({ number: i, text: i+1 });
                }
            } else {
                pages.push({ number: -1, text: "…"});
                for (i = self.currentPage() - 1; i <= self.currentPage() + 1; i++) {
                    pages.push({ number: i, text: i+1 });
                }
                pages.push({ number: -1, text: "…"});
            }
            pages.push({ number: self.lastPage(), text: self.lastPage() + 1})
        }
        return pages;
    });


}
