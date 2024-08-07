import type { Button$PressEvent } from "sap/m/Button";
import ComboBox from "sap/m/ComboBox";
import DatePicker from "sap/m/DatePicker";
import Dialog, {
  type Dialog$AfterCloseEvent,
  type Dialog$BeforeOpenEvent,
} from "sap/m/Dialog";
import Input from "sap/m/Input";
import InputBase, { type InputBase$ChangeEvent } from "sap/m/InputBase";
import Label from "sap/m/Label";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import MultiComboBox from "sap/m/MultiComboBox";
import type { ObjectIdentifier$TitlePressEvent } from "sap/m/ObjectIdentifier";
import Select from "sap/m/Select";
import FilterBar, {
  type FilterBar$FilterChangeEventParameters,
} from "sap/ui/comp/filterbar/FilterBar";
import FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
import type Control from "sap/ui/core/Control";
import { ValueState } from "sap/ui/core/library";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Row from "sap/ui/table/Row";
import type { RowActionItem$PressEvent } from "sap/ui/table/RowActionItem";
import Table from "sap/ui/table/Table";
import { MODEL_DATA } from "../constant/model";
import type { Product } from "../types";
import type { FilterData } from "../types/filter";
import type { Dict } from "../types/utils";
import Base from "./Base.controller";
import type Component from "sap/ui/core/Component";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import type { ODataSuccessResponse } from "../types/odata";
import type { Employee } from "../types/page/employee";

/**
 * @namespace sphinxjsc.com.fioritutorial.controller
 */
export default class Main extends Base {
  private svm: SmartVariantManagement;
  private expandedLabel: Label;
  private snappedLabel: Label;
  private filterBar: FilterBar;
  private table: Table;
  private addProductDialog?: Dialog;
  private productDetailDialog?: Dialog;
  private editProductDialog?: Dialog;
  private component: Component;

  public onInit(): void {
    this.svm = this.getControlById("svm");
    this.expandedLabel = this.getControlById("expandedLabel");
    this.snappedLabel = this.getControlById("snappedLabel");
    this.filterBar = this.getControlById("filterbar");
    this.table = this.getControlById("table");
    this.component = <Component>this.getOwnerComponent();

    this.setModel(
      new JSONModel({
        currency: "VND",
      }),
      "view"
    );

    this.setModel(
      new JSONModel({
        ProductNames: MODEL_DATA.ProductNames,
        ProductCategories: MODEL_DATA.ProductCategories,
        ProductSuppliers: MODEL_DATA.ProductSuppliers,
      }),
      "searchHelp"
    );
    this.setModel(
      new JSONModel({
        rows: [],
      }),
      "table"
    );
    this.setModel(new JSONModel({}), "form");

    this.filterBar.registerFetchData(this.fetchData);
    this.filterBar.registerApplyData(this.applyData);
    this.filterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

    this.svm.addPersonalizableControl(
      new PersonalizableInfo({
        type: "filterBar",
        keyName: "persistencyKey",
        dataSource: "",
        control: this.filterBar,
      })
    );
    this.svm.initialise(() => {}, this.filterBar);

    this.onFetchData();
  }

  private onFetchData() {
    const tableModel = this.getModel("table");
    const oDataModel = <ODataModel>this.component.getModel();

    this.table.setBusy(true);
    oDataModel.read("/EmployeeSet", {
      success: (response: ODataSuccessResponse<Employee>) => {
        tableModel.setProperty("/rows", response.results);
        this.table.setBusy(false);
        console.log(response.results);
      },
      error: (error: Error) => {
        this.table.setBusy(false);
        console.log(error);
      },
    });
  }

  public currencyFormatter(salary: number, currency: string) {
    return Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
    }).format(salary);
  }

  // #region Filter
  // Get value fields to create new filter variant
  private fetchData = () => {
    return this.filterBar
      .getAllFilterItems(false)
      .reduce<FilterData[]>((acc, item: FilterGroupItem) => {
        const control = item.getControl();

        if (!control) {
          return acc;
        }

        const fieldName = item.getName();
        const groupName = item.getGroupName();

        let fieldData: string | string[] = "";

        if (control.isA<MultiComboBox>("sap.m.MultiComboBox")) {
          fieldData = control.getSelectedKeys();
        } else if (
          control.isA<ComboBox | Select>(["sap.m.ComboBox", "sap.m.Select"])
        ) {
          fieldData = control.getSelectedKey();
        } else if (control.isA<DatePicker>("sap.m.DatePicker")) {
          fieldData = control.getValue();
        } else if (control.isA<Input>("sap.m.Input")) {
          fieldData = control.getValue();
        }

        acc.push({
          groupName,
          fieldName,
          fieldData,
        });

        return acc;
      }, []);
  };

  // Apply data to selected filter variant
  private applyData = (data: unknown) => {
    (<FilterData[]>data).forEach((item) => {
      const { groupName, fieldName, fieldData } = item;

      const control = this.filterBar.determineControlByName(
        fieldName,
        groupName
      );

      if (control.isA<MultiComboBox>("sap.m.MultiComboBox")) {
        control.setSelectedKeys(<string[]>fieldData);
      } else if (
        control.isA<ComboBox | Select>(["sap.m.ComboBox", "sap.m.Select"])
      ) {
        control.setSelectedKey(<string>fieldData);
      } else if (control.isA<DatePicker>("sap.m.DatePicker")) {
        control.setValue(<string>fieldData);
      } else if (control.isA<Input>("sap.m.Input")) {
        control.setValue(<string>fieldData);
      }
    });
  };

  private getFiltersWithValues = () => {
    return this.filterBar
      .getFilterGroupItems()
      .reduce<FilterGroupItem[]>((acc, item) => {
        const control = item.getControl();

        if (!control) {
          return acc;
        }

        if (
          control.isA<MultiComboBox>("sap.m.MultiComboBox") &&
          control.getSelectedKeys().length
        ) {
          acc.push(item);
        } else if (
          control.isA<ComboBox | Select>(["sap.m.ComboBox", "sap.m.Select"]) &&
          control.getSelectedKey()
        ) {
          acc.push(item);
        } else if (
          control.isA<DatePicker>("sap.m.DatePicker") &&
          control.getValue()
        ) {
          acc.push(item);
        } else if (control?.isA<Input>("sap.m.Input") && control.getValue()) {
          acc.push(item);
        }

        return acc;
      }, []);
  };

  public onFieldChange(event: FilterBar$FilterChangeEventParameters) {
    this.svm.currentVariantSetModified(true);
    this.filterBar.fireFilterChange(event);
  }

  public onFilterChange() {
    this.updateLabelsAndTable();
  }

  public onAfterVariantLoad() {
    this.updateLabelsAndTable();
  }

  private updateLabelsAndTable() {
    const expandedText =
      this.filterBar.retrieveFiltersWithValuesAsTextExpanded();
    const snappedText = this.filterBar.retrieveFiltersWithValuesAsText();

    this.expandedLabel.setText(expandedText);
    this.snappedLabel.setText(snappedText);
    this.table.setShowOverlay(true);
  }

  public onSearch() {
    const values = this.filterBar
      .getFilterGroupItems()
      .reduce<Dict>((acc, item) => {
        const name = item.getName();
        const control = item.getControl();

        if (!control) {
          return acc;
        }

        if (control.isA<MultiComboBox>("sap.m.MultiComboBox")) {
          acc[name] = control.getSelectedKeys();
        } else if (
          control.isA<ComboBox | Select>(["sap.m.ComboBox", "sap.m.Select"])
        ) {
          acc[name] = control.getSelectedKey();
        } else if (control.isA<DatePicker>("sap.m.DatePicker")) {
          acc[name] = control.getValue();
        } else if (control.isA<Input>("sap.m.Input")) {
          acc[name] = control.getValue();
        }

        return acc;
      }, {});

    console.log(values);
  }
  // #endregion

  // Add product
  public async onOpenAddProduct() {
    if (!this.addProductDialog) {
      this.addProductDialog = await (<Promise<Dialog>>this.loadFragment({
        name: "sphinxjsc.com.fioritutorial.view.fragments.AddProduct",
      }));
    }

    this.addProductDialog.bindElement("form>/");
    this.addProductDialog.open();
  }

  public onCloseAddProduct() {
    this.addProductDialog?.close();
  }

  public onAddProduct() {
    const tableModel = this.getModel("table");

    const controls = this.getControlsByFieldGroupId<InputBase>({
      control: this.addProductDialog,
      groupId: "FormField",
    });

    const isValid = this.validateControls(controls);

    if (!isValid) {
      return;
    }

    const value = <Product>this.getModel("form").getData();
    const rows = (<Product[]>tableModel.getProperty("/rows")).slice();
    rows.push(value);

    tableModel.setProperty("/rows", rows);

    MessageToast.show("Product was successfully created");

    this.onCloseAddProduct();
  }

  // Edit product
  public async onOpenEditProduct(event: RowActionItem$PressEvent) {
    const source = event.getSource();
    const rowIndex = event.getParameter("row")?.getIndex();
    const row = <Product>source.getBindingContext("table")?.getObject();

    this.getModel("form").setData(row);

    if (!this.editProductDialog) {
      this.editProductDialog = await (<Promise<Dialog>>this.loadFragment({
        name: "sphinxjsc.com.fioritutorial.view.fragments.EditProduct",
      }));
    }

    this.editProductDialog.bindElement(`table>/rows/${rowIndex}`);
    this.editProductDialog.open();
  }

  public onBeforeEditProduct(event: Dialog$BeforeOpenEvent) {
    const oDataModel = <ODataModel>this.component.getModel();
    const formModel = this.getModel("form");
    const dialog = event.getSource();
    const row = <Employee>dialog.getBindingContext("table")?.getObject();

    dialog.setBusy(true);
    const key = oDataModel.createKey("/EmployeeSet", row);
    // `/EmployeeSet(Employeeid='${row.Employeeid}')`
    oDataModel.read(key, {
      success: (response: Employee) => {
        formModel.setData(response);
        dialog.bindElement("form>/"); // 2
        dialog.setBusy(false);
      },
      error: (error: Error) => {
        dialog.setBusy(false);
        console.log(error);
      },
    });
  }

  public onCloseEditProduct() {
    this.editProductDialog?.close();
  }

  public onEditProduct(event: Button$PressEvent) {
    const oDataModel = <ODataModel>this.component.getModel();
    const dialog = <Dialog>this.editProductDialog;

    const controls = this.getControlsByFieldGroupId<InputBase>({
      control: this.editProductDialog,
      groupId: "FormField",
    });

    const isValid = this.validateControls(controls);

    if (!isValid) {
      return;
    }

    const value = <Product>this.getModel("form").getData();

    dialog.setBusy(true);
    const key = oDataModel.createKey("/EmployeeSet", value);
    // `/EmployeeSet(Employeeid='${row.Employeeid}')`
    oDataModel.update(key, value, {
      success: (response: Employee) => {
        console.log(response);
        MessageToast.show("Product was successfully updated");
        this.onFetchData();
      },
      error: (error: Error) => {
        dialog.setBusy(false);
        console.log(error);
      },
    });

    this.onCloseEditProduct();
  }

  // Product detail
  public async onOpenProductDetail(event: ObjectIdentifier$TitlePressEvent) {
    const source = event.getSource();
    const path = <string>source.getBindingContext("table")?.getPath();

    if (!this.productDetailDialog) {
      this.productDetailDialog = await (<Promise<Dialog>>this.loadFragment({
        name: "sphinxjsc.com.fioritutorial.view.fragments.ProductDetail",
      }));
    }

    this.productDetailDialog.bindElement(`table>${path}`);
    this.productDetailDialog.open();
  }

  // 1. Binding model `form` vào dialog => truy cập giá trị: form>FieldName
  // 2. Set data vào model `form` => truy cập giá trị trực tiếp từ model: form>/FieldName
  public onBeforeOpenEmployeeDetail(event: Dialog$BeforeOpenEvent) {
    const oDataModel = <ODataModel>this.component.getModel();
    const formModel = this.getModel("form");
    const dialog = event.getSource();
    const row = <Employee>dialog.getBindingContext("table")?.getObject();

    dialog.setBusy(true);
    const key = oDataModel.createKey("/EmployeeSet", row);
    // `/EmployeeSet(Employeeid='${row.Employeeid}')`
    oDataModel.read(key, {
      success: (response: Employee) => {
        formModel.setData(response);
        dialog.bindElement("form>/"); // 2
        dialog.setBusy(false);
      },
      error: (error: Error) => {
        dialog.setBusy(false);
        console.log(error);
      },
    });
  }

  public onCloseProductDetail() {
    this.productDetailDialog?.close();
  }

  // Clean up after close dialog
  public onAfterCloseDialog(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();

    const controls = this.getControlsByFieldGroupId<InputBase>({
      control: dialog,
      groupId: "FormField",
    });

    this.clearControlErrorMessages(controls);

    dialog.unbindElement("form");
    dialog.unbindElement("table");
    this.getModel("form").setData({});
  }

  // Delete product
  public onDeleteProduct(event: RowActionItem$PressEvent) {
    const oDataModel = <ODataModel>this.component.getModel();
    const row = <Employee>(
      event.getSource().getBindingContext("table")?.getObject()
    );

    MessageBox.confirm("Do you want to delete this row?", {
      actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
      emphasizedAction: MessageBox.Action.DELETE,
      onClose: (action: unknown) => {
        if (action === MessageBox.Action.DELETE) {
          const key = oDataModel.createKey("/EmployeeSet", row);
          // `/EmployeeSet(Employeeid='${row.Employeeid}')`
          oDataModel.remove(key, {
            success: () => {
              this.onFetchData();
              MessageToast.show("Employee was successfully deleted");
            },
            error: (error: Error) => {
              console.log(error);
            },
          });
        }
      },
    });
  }

  public onDeleteProducts() {
    const tableModel = this.getModel("table");
    const indices = this.table.getSelectedIndices();

    if (!indices.length) {
      MessageToast.show("Please select row to delete");
      return;
    }

    MessageBox.confirm("Do you want to delete selected rows?", {
      actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
      emphasizedAction: MessageBox.Action.DELETE,
      onClose: (action: unknown) => {
        if (action === MessageBox.Action.DELETE) {
          const rows = (<Product[]>tableModel.getProperty("/rows")).slice();
          const rest = rows.filter((_, index) => !indices.includes(index));

          tableModel.setProperty("/rows", rest);

          MessageToast.show("Products have been successfully deleted");
        }
      },
    });
  }

  // Table
  public onRowSelectionChange() {
    const indices = this.table.getSelectedIndices();
    this.getModel("table").setProperty("/selectedIndices", [...indices]);
  }

  // Messaging
  public onChangeValue(event: InputBase$ChangeEvent) {
    const source = event.getSource();
    if (source.getVisible()) {
      this.validateInputs(source);
    }
  }

  private clearControlErrorMessages(controls: InputBase[]) {
    controls.forEach((control) => {
      control.setValueState(ValueState.None);
      control.setValueStateText("");
    });
  }

  private getControlsByFieldGroupId<T extends Control>(props: {
    control?: Control;
    groupId: string;
  }) {
    const { control, groupId } = props;

    if (!control) return [];

    const controls = control
      .getControlsByFieldGroupId(groupId)
      .filter((control) => {
        const isVisible = control.getVisible();
        const isValidInput = control.isA(["sap.m.Input", "sap.m.ComboBox"]);

        return isVisible && isValidInput;
      });

    return controls as T[];
  }

  private validateControls(controls: InputBase[]) {
    let isValid = false;
    let isError = false;

    controls.forEach((control) => {
      isError = this.validateInputs(control);
      isValid = isValid || isError;
    });

    return !isValid;
  }

  private validateInputs(source: InputBase) {
    let isError = false;
    let isRequiredError = false;

    if (!source.getBindingContext("form")) {
      return false;
    }

    source.setValueState(ValueState.None);
    source.setValueStateText("");

    const isRequired = source.getRequired();

    if (source.isA<MultiComboBox>("sap.m.MultiComboBox")) {
      const value = source.getSelectedKeys();
      if (!value.length && isRequired) {
        isRequiredError = true;
      }
    } else if (
      source.isA<ComboBox | Select>(["sap.m.ComboBox", "sap.m.Select"])
    ) {
      const value = source.getSelectedKey();
      if (!value && isRequired) {
        isRequiredError = true;
      }
    } else if (source.isA<DatePicker>("sap.m.DatePicker")) {
      const value = source.getValue();
      if (!value && isRequired) {
        isRequiredError = true;
      }
    } else if (source.isA<Input>("sap.m.Input")) {
      const value = source.getValue();
      if (!value && isRequired) {
        isRequiredError = true;
      }
    }

    if (isRequiredError) {
      source.setValueState(ValueState.Error);
      source.setValueStateText("Required");
      isError = true;
    }

    // Add more validation here

    return isError;
  }
}
