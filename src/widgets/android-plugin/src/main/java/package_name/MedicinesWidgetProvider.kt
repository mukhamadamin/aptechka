package com.anonymous.HomeAidKit

import android.content.Context

class MedicinesWidgetProvider : BaseListWidgetProvider() {
  override fun title(context: Context): String = context.getString(R.string.widget_medicines_title)

  override fun lines(context: Context): List<String> = WidgetDataStore.getMedicineLines(context)
}
