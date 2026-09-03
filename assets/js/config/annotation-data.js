(function () {
  window.PrototypeAnnotationData = {
  "pages": {
    "warehouse-archive.html::仓库档案": [
      {
        "id": "warehouse-detail-modal",
        "target": "detail-modal",
        "placement": "right",
        "title": "查看仓库",
        "headerColumn": "warehouseCode",
        "items": [
          "新增显示仓库编码、负责人、联系电话、运营分公司和添加时间。",
          "字段在弹窗中按单列方式展示。"
        ],
        "number": "4",
        "popoverPosition": {
          "x": 27,
          "y": 19
        },
        "markerPosition": {
          "x": 68,
          "y": -48
        },
        "deleted": true
      },
      {
        "id": "warehouse-filter-fields",
        "target": "filter",
        "placement": "left",
        "title": "查询项",
        "items": [
          "新增运营分公司查询项，选项取值来源行政区域数据字典，下拉单选框，支持搜索，模糊匹配，默认选中“全部”；",
          "新增负责人/联系电话查询项，搜索框，模糊匹配，支持查询仓库负责人姓名或联系电话；"
        ],
        "number": "3",
        "markerPosition": {
          "x": -14,
          "y": 16
        },
        "popoverPosition": {
          "x": -384,
          "y": 21
        },
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": -14,
              "y": 16
            },
            "popoverPosition": {
              "x": -384,
              "y": 21
            }
          }
        },
        "muted": true
      },
      {
        "id": "warehouse-export-button",
        "target": "toolbar-action",
        "actionKey": "export",
        "placement": "left",
        "entryMarkerPosition": "left",
        "title": "导出按钮",
        "items": [
          "新增导出按钮，支持导出选中的仓库档案列表项；",
          "点击导出时校验是否已勾选列表项， 未勾选时提示“请先勾选要导出的仓库”；"
        ],
        "popoverActions": [
          {
            "key": "view-warehouse-export-template",
            "label": "查看导出模版",
            "className": "btn btn-sm record-annotation-demo-action record-annotation-action"
          }
        ],
        "number": "4",
        "markerPosition": {
          "x": -13,
          "y": 21
        },
        "popoverPosition": {
          "x": -377,
          "y": 20
        },
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": -13,
              "y": 21
            },
            "popoverPosition": {
              "x": -377,
              "y": 20
            }
          }
        },
        "muted": true
      },
      {
        "id": "warehouse-list-header",
        "target": "table-header",
        "title": "仓库列表",
        "items": [
          "新增固定显示勾选框；",
          "新增显示负责人、联系电话、运营分公司；",
          "一个仓库由多个分公司运营时，运营分公司省略显示为“等*家单位”；",
          "列表操作项固定显示；",
          "已经关联过仓库的运营分公司不可再次被其他仓库关联；"
        ],
        "number": "1",
        "popoverPosition": {
          "x": -382,
          "y": 23
        },
        "markerPosition": {
          "x": -751,
          "y": -18
        },
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": -751,
              "y": -18
            },
            "popoverPosition": {
              "x": -382,
              "y": 23
            }
          }
        },
        "muted": true
      },
      {
        "id": "warehouse-add-modal",
        "target": "add-modal",
        "placement": "right",
        "scope": "modal",
        "entryScope": "page",
        "modalKey": "warehouse-add",
        "anchorPosition": "modal-header-right",
        "title": "添加仓库",
        "items": [
          "新增负责人、联系电话、运营分公司字段。",
          "负责人、联系电话为非必填。",
          "运营分公司为非必填，支持多选。",
          "运营分公司选项默认最多显示5行，超出支持滑动查看。"
        ],
        "number": "2",
        "popoverPosition": {
          "x": 32,
          "y": -153
        },
        "markerPosition": {
          "x": 95,
          "y": 16
        },
        "positionByScope": {
          "modal": {
            "markerPosition": {
              "x": 125,
              "y": 15
            },
            "popoverPosition": {
              "x": 32,
              "y": -153
            }
          },
          "page": {
            "markerPosition": {
              "x": 96,
              "y": 14
            }
          }
        },
        "muted": true
      },
      {
        "id": "custom-1787393732657-1",
        "target": "custom",
        "targetSelector": "div.app-layout > section.main-section > main.content-area > section.page-card > div.record-table-annotation-surface:nth-of-type(4) > div.operations-table-container:nth-of-type(2) > div.operations-table-wrap:nth-of-type(1) > table.operations-table > thead > tr > th:nth-of-type(3)",
        "placement": "right",
        "title": "仓库编码",
        "items": [
          "点击仓库编码显示标题为“查看仓库”的弹窗；",
          "弹窗新增显示仓库编码、负责人、联系电话和运营分公司。"
        ],
        "number": "5",
        "markerPosition": {
          "x": 119,
          "y": 5
        },
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 119,
              "y": 5
            }
          }
        },
        "muted": true
      },
      {
        "id": "custom-1787480651906-2",
        "target": "custom",
        "targetSelector": "div > div.operations-modal-backdrop > section.operations-modal > header.operations-modal-header > h3",
        "placement": "right",
        "scope": "modal",
        "title": "添加仓库档案",
        "items": [
          "非34放"
        ],
        "number": "6",
        "deleted": true
      },
      {
        "id": "custom-1787540809914-2",
        "target": "custom",
        "targetSelector": "div > div.operations-modal-backdrop > section.operations-modal > div.operations-modal-body > form > div.operations-form-grid > div.operations-form-item:nth-of-type(5) > div.operations-form-control > div.operations-multi-select:nth-of-type(1) > label.operations-multi-option:nth-of-type(2)",
        "placement": "right",
        "scope": "modal",
        "title": "添加仓库弹窗标注",
        "items": [
          "仅支持选中未关联仓库的分公司选项，已关联其他仓库的分公司显示为选中置灰状态"
        ],
        "number": "6",
        "positionByScope": {
          "modal": {
            "markerPosition": {
              "x": -123,
              "y": -36
            },
            "popoverPosition": {
              "x": -358,
              "y": 30
            }
          }
        }
      },
      {
        "id": "custom-1787544037046-1",
        "target": "custom",
        "targetSelector": "section.page-card > div.record-table-annotation-surface:nth-of-type(4) > div.operations-table-container:nth-of-type(2) > div.operations-table-wrap:nth-of-type(1) > table.operations-table > thead > tr > th:nth-of-type(8)",
        "placement": "right",
        "scope": "page",
        "title": "运营分公司",
        "items": [
          "已经关联过仓库的运营分公司可不再次被其他仓库关联；"
        ],
        "number": "7",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 139,
              "y": -34
            },
            "popoverPosition": {
              "x": -370,
              "y": 28
            }
          }
        },
        "deleted": true
      }
    ],
    "supplier-archive.html::supplierManagementPage": [
      {
        "id": "supplier-list-header",
        "placement": "right",
        "title": "供应商标段",
        "items": [
          "添加/编辑供应商时间，必须选择供应商供货标段，单选/多选/全选，未选时提交toast报错“清选择供应商的供货标段”"
        ],
        "number": "1",
        "markerPosition": {
          "x": -255,
          "y": -11
        },
        "popoverPosition": {
          "x": -386,
          "y": 18
        },
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": -479,
              "y": -26
            },
            "popoverPosition": {
              "x": -386,
              "y": 18
            }
          }
        },
        "deleted": true
      },
      {
        "id": "supplier-export-button",
        "placement": "left",
        "actionKey": "export",
        "entryMarkerPosition": "left",
        "title": "导出按钮",
        "items": [
          "点击导出时校验是否已勾选列表项目，未勾选时提示“请先勾选要导出的供应商”。"
        ],
        "popoverActions": [
          {
            "key": "view-supplier-export-template",
            "label": "查看导出模版",
            "className": "btn btn-sm record-annotation-demo-action record-annotation-action"
          }
        ],
        "number": "2",
        "markerPosition": {
          "x": -12,
          "y": 18
        },
        "popoverPosition": {
          "x": -385,
          "y": 16
        },
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": -12,
              "y": 18
            },
            "popoverPosition": {
              "x": -385,
              "y": 16
            }
          }
        },
        "muted": true
      },
      {
        "id": "custom-1787674000554-1",
        "target": "custom",
        "targetSelector": "div.page-card:nth-of-type(1) > div.supplier-table-annotation-surface:nth-of-type(2) > div.bidding-table-container:nth-of-type(2) > div.bidding-table-wrapper:nth-of-type(1) > table.bidding-table > tbody > tr:nth-of-type(3) > td:nth-of-type(5)",
        "placement": "right",
        "scope": "page",
        "title": "供应商标段配置与审核",
        "items": [
          "供应商档案列表中的添加、编辑和审核入口均新增标段配置。",
          "添加/编辑，审核供应商时标段必填，后续供应商商品和竞价报价范围均由这些启用标段决定。"
        ],
        "number": "2",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 133,
              "y": -157
            }
          }
        }
      }
    ],
    "warehouse-monitor.html::仓库监控": [
      {
        "id": "custom-1787479690617-1",
        "target": "custom",
        "targetSelector": "#addMonitorPointButton",
        "placement": "right",
        "title": "视频查看",
        "items": [
          "交发集团需要查看全部仓库的监控视频，下属单位支持查看关联仓库的监控视频；",
          "同一仓库内的点位名称不可重复；"
        ],
        "number": "1",
        "markerPosition": {
          "x": 67,
          "y": 14
        },
        "popoverPosition": {
          "x": 35,
          "y": 2
        },
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 67,
              "y": 14
            },
            "popoverPosition": {
              "x": 35,
              "y": 2
            }
          }
        },
        "muted": true
      }
    ],
    "lower-units.html::下属单位管理": [
      {
        "id": "custom-1787541052513-1",
        "target": "custom",
        "targetSelector": "div.lower-units-modal:nth-of-type(1) > div.lower-units-dialog > div.lower-units-dialog-body:nth-of-type(2) > div.lower-units-form-grid > div.lower-units-form-field:nth-of-type(7) > label",
        "placement": "right",
        "scope": "modal",
        "title": "绑定负责区域",
        "items": [
          "只能选中未被分公司关联的区域，已被分公司关联的区域不可被其他分公司关联；",
          "已经被其他分公司关联的区域显示为选中置灰禁用状态；"
        ],
        "number": "1",
        "positionByScope": {
          "modal": {
            "markerPosition": {
              "x": 85,
              "y": -8
            }
          }
        }
      },
      {
        "id": "custom-1787541142830-3",
        "target": "custom",
        "targetSelector": "section.page-card > div.lower-units-table-wrap:nth-of-type(3) > table.lower-units-table > thead > tr > th:nth-of-type(3)",
        "placement": "right",
        "scope": "page",
        "title": "负责区域",
        "items": [
          "只能选中未被分公司关联的区域，已被分公司关联的区域不可被其他分公司关联；"
        ],
        "number": "2",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 88,
              "y": -18
            }
          }
        },
        "muted": true
      }
    ],
    "warehouse-export-template.html::warehouseExportTemplateApp": [
      {
        "id": "custom-1787562131288-4",
        "target": "custom",
        "targetSelector": "main.supplier-register-page > section.supplier-register-section > div.supplier-register-section-inner > div.warehouse-export-template-table-wrap > table.warehouse-export-template-table > thead > tr:nth-of-type(2) > th:nth-of-type(7)",
        "placement": "right",
        "scope": "page",
        "title": "运营分公司",
        "items": [
          "仓库关联多个仓库，导出时需要显示该仓库的全部运营分公司名称，不可省略显示"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 22,
              "y": 10
            },
            "popoverPosition": {
              "x": -398,
              "y": 0
            }
          }
        }
      }
    ],
    "segment-management.html::segmentManagementPage": [
      {
        "id": "custom-1787668304041-1",
        "target": "custom",
        "targetSelector": "div.page-card:nth-of-type(1) > section.bidding-filter-panel",
        "placement": "right",
        "scope": "page",
        "title": "标段",
        "items": [
          "标段内的商品分类不可重复；",
          "供应商只能对允许供货的标段填写报价；",
          "供应商端商品列表只显示允许供应的商品信息；",
          "供应商档案，添加供应商时标段必填；"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 862,
              "y": 19
            }
          }
        },
        "deleted": true
      },
      {
        "id": "custom-1787669884896-1",
        "target": "custom",
        "targetSelector": "div.page-card:nth-of-type(1) > section.bidding-filter-panel",
        "placement": "right",
        "scope": "page",
        "title": "标段名称高级查询▾查询重置",
        "items": [
          "标段新建后默认启用状态；",
          "不同标段的商品三级分类不可重复；",
          "新建/编辑标段，选择商品分类时，已经关联其他标段的商品三级分类置灰禁用；",
          "标段名称不能重复"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 644,
              "y": 46
            }
          }
        },
        "deleted": true
      },
      {
        "id": "custom-1787673915456-1",
        "target": "custom",
        "targetSelector": "div.page-card:nth-of-type(1) > div.bidding-table-container:nth-of-type(2) > div.bidding-table-wrapper:nth-of-type(1) > table.bidding-table > tbody > tr:nth-of-type(3) > td.align-left:nth-of-type(3)",
        "placement": "right",
        "scope": "page",
        "title": "标段分类唯一性与状态",
        "items": [
          "添加/编辑标段时，商品分类为必填；已被其他标段占用的分类显示为勾选置灰，保存时再次校验，避免不同标段的商品分类重复。"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": -205,
              "y": -182
            },
            "popoverPosition": {
              "x": 27,
              "y": 28
            }
          }
        }
      }
    ],
    "supplier-bidding-quotation.html::supplierQuotationPage": [
      {
        "id": "custom-1787670254558-1",
        "target": "custom",
        "targetSelector": "#supplierQuotationPage",
        "placement": "right",
        "scope": "page",
        "title": "竞价报价",
        "items": [
          "供应商只能对允许供货的标段填写报价；"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 802,
              "y": 60
            },
            "popoverPosition": {
              "x": -389,
              "y": 8
            }
          }
        },
        "deleted": true
      },
      {
        "id": "custom-1787673892305-1",
        "target": "custom",
        "targetSelector": "#supplierQuotationPage",
        "placement": "right",
        "scope": "page",
        "title": "供应商竞价报价范围",
        "items": [
          "供应商只可查看自己被设置的启用标段对应竞价",
          "并且只能对该标段所含商品填写完整报价"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 785,
              "y": 66
            }
          }
        }
      }
    ],
    "supplier-editor.html::supplierFormPage": [
      {
        "id": "custom-1787670654889-1",
        "target": "custom",
        "targetSelector": "#supplierFormPage",
        "placement": "right",
        "scope": "page",
        "title": "添加供应商标段设置",
        "items": [
          "添加/编辑供应商时间，必须选择供应商供货标段，单选/多选/全选，未选时提交toast报错“清选择供应商的供货标段”"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 794,
              "y": 128
            },
            "popoverPosition": {
              "x": -399,
              "y": 5
            }
          }
        },
        "deleted": true
      },
      {
        "id": "custom-1787673934170-1",
        "target": "custom",
        "targetSelector": "#supplierFormPage",
        "placement": "right",
        "scope": "page",
        "title": "供应商合作标段设置",
        "items": [
          "教育局端添加或编辑供应商时，“标段”为必填项，支持全选或多选启用标段；合作期限字段保持必填。供应商审核页面沿用同一标段回显与校验规则，审核通过前可核对供应商的合作标段范围。"
        ]
      }
    ],
    "notice-management.html::noticeManagementPage": [
      {
        "id": "custom-1787671728207-1",
        "target": "custom",
        "targetSelector": "div.notice-page-root > section.page-card > div.bidding-table-container:nth-of-type(2) > div.bidding-table-wrapper:nth-of-type(1) > table.bidding-table > thead > tr > th:nth-of-type(2)",
        "placement": "right",
        "scope": "page",
        "title": "公告管理功能说明",
        "items": [
          "支持按公告标题、发布日期、状态进行查询，并支持查询和重置。",
          "列表展示公告标题、接收对象（已读/总数）、强制弹框、发布时间、发布人、状态和操作，并支持分页。",
          "支持新增公告，维护标题、正文、发布时间、失效时间、强制弹框、接收对象及附件；学校和供应商接收对象支持多选、全选。",
          "支持预览、强制弹窗、撤回、编辑、删除和批量删除等操作。",
          "供应商端和学校端仅展示允许查看的公告，支持查看详情和下载附件。"
        ]
      },
      {
        "id": "notice-force-popup-education",
        "target": "custom",
        "targetSelector": "#noticeRows [data-action=\"force-row\"]",
        "placement": "right",
        "scope": "page",
        "title": "强制弹窗设置说明",
        "items": [
          "公告开启“强制弹框”后，必须设置失效时间；发布后，符合接收对象范围的用户登录系统时会强制显示公告弹窗。",
          "列表中的“强制弹窗”操作可重新设置并发送当前公告的强制展示，确认后提示已发送。",
          "达到失效时间后不再强制弹出，公告仍可按接收权限在公告列表中查看。"
        ]
      },
      {
        "id": "custom-1787673987937-1",
        "target": "custom",
        "targetSelector": "div.notice-page-root > section.page-card > div.bidding-table-container:nth-of-type(2) > div.bidding-table-wrapper:nth-of-type(1) > table.bidding-table > tbody > tr:nth-of-type(3) > td:nth-of-type(4)",
        "placement": "right",
        "scope": "page",
        "title": "公告发布与接收对象规则",
        "items": [
          "教育局端负责创建、编辑、预览、发布、撤回和删除公告；发布时可分别选择学校和供应商作为接收对象，两个对象面板均支持多选与全选。保存并发布后，学校端或供应商端仅能看到已发布且命中自身接收对象的公告，公告详情支持附件下载。"
        ],
        "number": "2",
        "deleted": true
      },
      {
        "id": "custom-1787790667530-1",
        "target": "custom",
        "targetSelector": "#noticeFormPage",
        "placement": "right",
        "scope": "page",
        "title": "学校/供应商选择框",
        "items": [
          "选项最多显示五行，超过五行时滑动查看"
        ],
        "number": "3",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 845,
              "y": 261
            },
            "popoverPosition": {
              "x": 14,
              "y": -83
            }
          }
        }
      }
    ],
    "school-notice-management.html::supplierNoticePage": [
      {
        "id": "custom-1787673821388-1",
        "target": "custom",
        "targetSelector": "#supplierNoticePage",
        "placement": "right",
        "scope": "page",
        "title": "学校端公告接收与下载",
        "items": [
          "学校端仅展示教育局已发布且接收对象包含当前学校的公告；列表展示公告标题、接收对象、强制弹框、发布时间和发布人。点击公告标题或查看详情可阅读正文，并可下载公告附件。"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 895,
              "y": 103
            }
          }
        }
      },
      {
        "id": "notice-force-popup-school",
        "target": "custom",
        "targetSelector": "#supplierNoticeRoot [data-modal=\"supplier-force-demo\"] .supplier-notice-force-content",
        "placement": "right",
        "scope": "modal",
        "title": "教育局强制弹框设置说明",
        "items": [
          "教育局端在公告新增/编辑中将“强制弹框”设为“是”，并填写失效时间后发布，符合接收对象范围的学校用户登录系统时会看到此弹窗。",
          "强制弹框只向教育局端选定的学校接收对象展示；达到失效时间后不再强制弹出，公告仍按接收权限保留在列表中。",
          "当前弹窗用于展示学校端接收效果；“我已知晓”按钮完成5秒倒计时后才可确认。"
        ]
      }
    ],
    "supplier-notice-management.html::supplierNoticePage": [
      {
        "id": "custom-1787673844538-1",
        "target": "custom",
        "targetSelector": "#supplierNoticePage",
        "placement": "right",
        "scope": "page",
        "title": "供应商端公告接收与下载",
        "items": [
          "供应商端仅展示教育局已发布且接收对象包含当前供应商的公告；列表展示公告标题、接收对象、强制弹框、发布时间和发布人。点击公告标题或查看详情可阅读公告正文，并可下载公告附件。"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 863,
              "y": 76
            }
          }
        }
      },
      {
        "id": "notice-force-popup-supplier",
        "target": "custom",
        "targetSelector": "#supplierNoticeRoot [data-modal=\"supplier-force-demo\"] .supplier-notice-force-content",
        "placement": "right",
        "scope": "modal",
        "title": "教育局强制弹框设置说明",
        "items": [
          "教育局端在公告新增/编辑中将“强制弹框”设为“是”，并填写失效时间后发布，符合接收对象范围的供应商用户登录系统时会看到此弹窗。",
          "强制弹框只向教育局端选定的供应商接收对象展示；达到失效时间后不再强制弹出，公告仍按接收权限保留在列表中。",
          "当前弹窗用于展示供应商端接收效果；“我已知晓”按钮完成5秒倒计时后才可确认。"
        ]
      }
    ],
    "supplier-product-management.html::page": [
      {
        "id": "custom-1787673876605-1",
        "target": "custom",
        "targetSelector": "div.page-card > div.workspace-grid:nth-of-type(1) > section.table-panel:nth-of-type(2) > div.table-container:nth-of-type(3) > div.table-wrapper:nth-of-type(1) > table.data-table > tbody > tr:nth-of-type(2) > td.name-cell:nth-of-type(5)",
        "placement": "right",
        "scope": "page",
        "title": "供应商商品的标段范围",
        "items": [
          "供应商端商品列表只展示当前供应商已设置且仍处于启用状态的标段所覆盖的商品，"
        ],
        "number": "1"
      }
    ],
    "bid-management-form.html::bidFormPage": [
      {
        "id": "custom-1787673951937-1",
        "target": "custom",
        "targetSelector": "#quoteStart",
        "placement": "right",
        "scope": "page",
        "title": "竞价新增/编辑字段与供应商联动",
        "items": [
          "竞价新增/编辑表单先选择标段，再选择参与竞价供应商；供应商下拉项只展示已启用且已配置该标段的供应商。"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 501,
              "y": 213
            }
          }
        }
      },
      {
        "id": "custom-1787673969319-1",
        "target": "custom",
        "targetSelector": "#bidFormPage",
        "placement": "right",
        "scope": "page",
        "title": "竞价新增/编辑字段与供应商联动",
        "items": [
          "竞价新增/编辑表单先选择标段，再选择参与竞价供应商；供应商下拉项只展示已启用且已配置该标段的供应商，未选择标段时供应商选择框不可用。日期、时间、名称等输入项统一使用通用占位字号和浅灰字体，避免页面间样式不一致。"
        ],
        "number": "2",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 882,
              "y": 220
            }
          }
        },
        "deleted": true
      }
    ],
    "bid-management.html::bidManagementPage": [
      {
        "id": "custom-1787677328384-1",
        "target": "custom",
        "targetSelector": "[aria-label=\"竞价查询\"]",
        "placement": "right",
        "scope": "page",
        "title": "新增/编辑竞价",
        "items": [
          "竞价新增/编辑表单先选择标段，再选择参与竞价供应商；供应商下拉项只展示已启用且已配置该标段的供应商，未选择标段时供应商选择框不可用。"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 478,
              "y": 80
            }
          }
        }
      }
    ],
    "purchase-task.html::采购任务": [
      {
        "id": "purchase-task-generate-order",
        "target": "custom",
        "targetSelector": "[data-action=\"generate-order\"]",
        "placement": "left",
        "title": "生成采购单",
        "items": [
          "生成采购单时补录“企业期望送达时间”；默认比学校期望送达时间提前2天，且不能晚于学校期望送达时间。"
        ],
        "number": "2",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 250,
              "y": 325
            }
          }
        },
        "deleted": true
      },
      {
        "id": "custom-1787761196369-1",
        "target": "custom",
        "targetSelector": "[aria-label=\"采购任务\"]",
        "placement": "right",
        "scope": "page",
        "title": "生成采购单",
        "items": [
          "生成采购单时需设置企业期望送达时间"
        ],
        "number": "2",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 225,
              "y": 60
            },
            "popoverPosition": {
              "x": 24,
              "y": 21
            }
          }
        }
      }
    ],
    "supplier-purchase-order.html::supplierPurchaseOrderPage": [
      {
        "id": "supplier-purchase-enterprise-time-column",
        "target": "custom",
        "targetSelector": "#supplierPurchaseOrderPage .supplier-purchase-table th:nth-child(6)",
        "placement": "right",
        "title": "企业期望送达时间",
        "items": [
          "采购单列表展示供货企业生成采购单时提交的企业期望送达时间。"
        ],
        "number": "2",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 151,
              "y": 7
            }
          }
        }
      }
    ]
  }
};
})();
