(function () {
  window.PrototypeAnnotationData = {
  "schemaVersion": "20260904-1",
  "pages": {
    "school-recipe-center.html::schoolRecipeCenterPage": [
      {
        "id": "custom-1788504360166-1",
        "target": "custom",
        "targetSelector": "#schoolRecipeCenterPage",
        "placement": "right",
        "scope": "page",
        "title": "营养食谱",
        "items": [
          "默认显示当前月，仅可切换至前后一月；",
          "存在菜谱取消置灰，无菜谱的日期置灰可点击，右侧显示空样式；",
          "默认选中食堂；"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 266,
              "y": 37
            },
            "popoverPosition": {
              "x": 17,
              "y": 29
            }
          }
        }
      }
    ],
    "school-recipe-attendance.html::schoolRecipeAttendancePage": [
      {
        "id": "custom-1788504454232-1",
        "target": "custom",
        "targetSelector": "#schoolRecipeAttendancePage",
        "placement": "right",
        "scope": "page",
        "title": "就餐人数填报",
        "items": [
          "未填写人数时商品需求为空，填写人数后计算该餐次食谱对应人数的所需食材列表；",
          "餐次合计不为0即为该餐次填写完成；日期餐次全部填写完成即为完成，支持多日期填写，填写完成的日期昨日日历面板显示对应状态；提交时可将填写完成的日期需求合并至需求确认页；",
          "当日餐次存在合计人数为0时点击确认需求二次弹窗提示存在为填写人数，点击确定可正常提交"
        ],
        "number": "1",
        "positionByScope": {
          "page": {
            "markerPosition": {
              "x": 478,
              "y": 412
            },
            "popoverPosition": {
              "x": 41,
              "y": -1
            }
          }
        }
      }
    ]
  }
};
})();
