package com.anonymous.HomeAidKit.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.anonymous.HomeAidKit.R

abstract class BaseListWidgetProvider : AppWidgetProvider() {
  abstract fun title(context: Context): String
  abstract fun lines(context: Context): List<String>

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.widget_list).apply {
        setTextViewText(R.id.widgetTitle, title(context))

        val text = lines(context).take(8).joinToString("\n").ifBlank {
          context.getString(R.string.widget_empty)
        }
        setTextViewText(R.id.widgetBody, text)

        setOnClickPendingIntent(R.id.widgetRoot, appLaunchIntent(context))
      }

      appWidgetManager.updateAppWidget(id, views)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)

    if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, javaClass))
      if (ids.isNotEmpty()) onUpdate(context, manager, ids)
    }
  }

  private fun appLaunchIntent(context: Context): PendingIntent {
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
}
