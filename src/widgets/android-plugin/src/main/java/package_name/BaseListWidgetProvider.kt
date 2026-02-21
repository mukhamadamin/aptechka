package com.anonymous.HomeAidKit

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

abstract class BaseListWidgetProvider : AppWidgetProvider() {
  abstract fun title(context: Context): String
  abstract fun items(context: Context): List<WidgetListItem>
  abstract fun actionLabel(context: Context): String
  abstract fun actionIntent(context: Context, itemId: String): PendingIntent

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    val rowIds = intArrayOf(
      R.id.widgetRow1,
      R.id.widgetRow2,
      R.id.widgetRow3,
      R.id.widgetRow4,
      R.id.widgetRow5,
      R.id.widgetRow6,
    )
    val rowTextIds = intArrayOf(
      R.id.widgetRowText1,
      R.id.widgetRowText2,
      R.id.widgetRowText3,
      R.id.widgetRowText4,
      R.id.widgetRowText5,
      R.id.widgetRowText6,
    )
    val rowActionIds = intArrayOf(
      R.id.widgetRowAction1,
      R.id.widgetRowAction2,
      R.id.widgetRowAction3,
      R.id.widgetRowAction4,
      R.id.widgetRowAction5,
      R.id.widgetRowAction6,
    )

    for (id in appWidgetIds) {
      val listItems = items(context).take(6)
      val views = RemoteViews(context.packageName, R.layout.widget_list).apply {
        setTextViewText(R.id.widgetTitle, title(context))
        setTextViewText(R.id.widgetSubtitle, context.getString(R.string.widget_subtitle_tap_open))

        for (index in rowIds.indices) {
          if (index >= listItems.size) {
            setViewVisibility(rowIds[index], View.GONE)
            continue
          }

          val item = listItems[index]
          setViewVisibility(rowIds[index], View.VISIBLE)
          setTextViewText(rowTextIds[index], item.text)
          setTextViewText(rowActionIds[index], actionLabel(context))
          setOnClickPendingIntent(rowTextIds[index], appLaunchIntent(context))
          setOnClickPendingIntent(rowActionIds[index], actionIntent(context, item.id))
        }

        if (listItems.isEmpty()) {
          setViewVisibility(R.id.widgetRow1, View.VISIBLE)
          setTextViewText(R.id.widgetRowText1, context.getString(R.string.widget_empty))
          setTextViewText(R.id.widgetRowAction1, "•")
          setOnClickPendingIntent(R.id.widgetRowAction1, appLaunchIntent(context))
          setOnClickPendingIntent(R.id.widgetRowText1, appLaunchIntent(context))
        }

        setOnClickPendingIntent(R.id.widgetRoot, appLaunchIntent(context))
      }

      appWidgetManager.updateAppWidget(id, views)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)

    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, javaClass))
    if (ids.isNotEmpty()) onUpdate(context, manager, ids)
  }

  protected fun appLaunchIntent(context: Context): PendingIntent {
    val launchIntent =
      context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_MAIN)

    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    return PendingIntent.getActivity(
      context,
      javaClass.name.hashCode(),
      launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
  }

  protected fun openWidgetActionIntent(
    context: Context,
    action: String,
    itemId: String,
    requestCodeSeed: String
  ): PendingIntent {
    val householdId = WidgetDataStore.getHouseholdId(context).orEmpty()
    val uri = Uri.parse("homeaidkit://widget-action")
      .buildUpon()
      .appendQueryParameter("action", action)
      .appendQueryParameter("id", itemId)
      .appendQueryParameter("householdId", householdId)
      .build()

    val deepLinkIntent = Intent(Intent.ACTION_VIEW, uri).apply {
      `package` = context.packageName
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    return PendingIntent.getActivity(
      context,
      (javaClass.name + ":" + requestCodeSeed + ":" + itemId).hashCode(),
      deepLinkIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
  }
}
