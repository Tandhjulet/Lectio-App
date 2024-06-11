//
//  widget.swift
//  widget
//

import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        var lookAhead: [Date] = []
        let entryDate = Date()
      
        for hourOffset in 0 ..< 5 {
          lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }
            
        return SimpleEntry(date: Date(),
                    lookAhead: lookAhead,
                    modules: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
      
        var lookAhead: [Date] = []
        let entryDate = Date()
      
        for hourOffset in 0 ..< 5 {
          lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }
      
        let entry = SimpleEntry(date: entryDate,
                              lookAhead: lookAhead,
                              modules: [])
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []

        let currentDate = Date()
        for timeLineHourOffset in 0 ..< 5 {
            var lookAhead: [Date] = []
            let entryDate = Calendar.current.date(byAdding: .hour, value: timeLineHourOffset, to: currentDate)!
          
            for hourOffset in 0 ..< 5 {
              lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
            }
          
            let entry = SimpleEntry(date: entryDate,
                                  lookAhead: lookAhead,
                                  modules: [])
            entries.append(entry)
        }
            
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

extension Date {

    static func - (lhs: Date, rhs: Date) -> TimeInterval {
        return lhs.timeIntervalSinceReferenceDate - rhs.timeIntervalSinceReferenceDate
    }
  
    func dayOfWeek() -> String? {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "da-DK")
        dateFormatter.dateFormat = "EEEE"
        return dateFormatter.string(from: self)
    }

}

enum Status {
  case changed
  case cancelled
  case normal
}

struct Module {
  var start: Date
  var end: Date
  
  var title: String
  var status: Status
  var overlaps: Int = 2
  
  var _id: String
}

struct SimpleEntry: TimelineEntry {
    let date: Date
  
    let lookAhead: Array<Date>
    let modules: Array<Module>
}

struct widgetEntryView : View {
    var entry: Provider.Entry
  
    func calculateTop(module: Module, first: Date, geoHeight: CGFloat) -> CGFloat {
      let diff = module.start - first;
      var top = (diff/(60*60*5)) * geoHeight;
      top = top < 0 ? 0 : top+4;
      top += diff < 0 ? 0 : 4;

      return top;
    }
  
    func calculateHeight(start: Date, end: Date, geoHeight: CGFloat) -> CGFloat {
        var diff = end - start
        if(start < entry.lookAhead.first!) {
            diff -= (entry.lookAhead.first! - start)
        }
        
        return (diff/(60*60*5)) * geoHeight
    }
  
    private var ItemSeperator: some View {
      VStack(alignment: .leading, spacing: 0) {
        ForEach(entry.lookAhead, id: \.self) { lookAhead in
          Color.clear
            .frame(
              maxWidth: 0,
              maxHeight: 0
            )
          
          Divider().frame(height: 10)
             
          if entry.lookAhead.last.self != lookAhead.self {
            Spacer()
          }
        }
      }
    }
    
    var body: some View {
      if #available(iOSApplicationExtension 17.0, *) {
        
        VStack {
          HStack(spacing: 0) {
            Text(entry.lookAhead.first!.dayOfWeek()!)
              .font(.system(size: 9))
              .fontWeight(.heavy)
            
            Spacer()
            
            Text(entry.lookAhead.first!.formatted(date: .numeric, time: .omitted))
              .font(.system(size: 9))
              .fontWeight(.regular)
          }
          
          GeometryReader { geo in
            HStack(spacing: 5) {
              ZStack(alignment: .leading) {
                ItemSeperator
                
                ForEach(entry.modules, id: \._id) { module in
                  if(module.end > entry.lookAhead.first!) {
                    let top = calculateTop(module: module, first: entry.lookAhead.first!, geoHeight: geo.size.height);
                    
                    VStack(spacing: 0) {
                      Color.clear
                        .opacity(0)
                        .frame(
                          maxWidth: .infinity,
                          maxHeight: top
                        )
                      
                      let height = calculateHeight(start: module.start, end: module.end, geoHeight: geo.size.height) + (module.start < entry.lookAhead.first! ? 8+5 : 4)
                      
                      ZStack(alignment: .topLeading) {
                          Rectangle()
                              .fill(Color("Primary"))
                              .opacity(1)
                              .clipShape(
                                .rect(
                                    topLeadingRadius: module.start > entry.lookAhead.first! ? 3 : 0,
                                  bottomLeadingRadius: 3,
                                  bottomTrailingRadius: 3,
                                    topTrailingRadius: module.start > entry.lookAhead.first! ? 3 : 0,
                                  style: .continuous
                                )
                              )
                              .frame(
                                height: height
                              )
                          
                          if(height > 10+4*2) {
                              ZStack {
                                HStack(alignment: .top, spacing: 0) {
                                  Text(module.title)
                                    .font(.system(size: 9, weight: .bold))
                                    .multilineTextAlignment(.leading)
                                    .foregroundStyle(Color.white)
                                  
                                  if module.overlaps > 0 {
                                    Spacer()
                                  
                                    Text("+" + module.overlaps.description)
                                      .font(.system(size: 8))
                                      .multilineTextAlignment(.leading)
                                      .foregroundColor(Color.white)
                                      .fontWeight(.heavy)
                                      .opacity(0.7)
                                  }
                                }
                              }.padding(4).frame(height: height)
                          }
                        
                      }
                      .frame(width: .infinity, height: height)
                      
                      Spacer()
                    }
                  }
                }
              }
              .frame(
                maxWidth: .infinity,
                maxHeight: .infinity
              )
              
              VStack(alignment: .leading, spacing: 0) {
                ForEach(entry.lookAhead, id: \.self) { lookAhead in
                  Color.clear
                    .frame(
                      maxWidth: 0,
                      maxHeight: 0
                    )
                  
                  let time = lookAhead.formatted(date: .omitted, time: .shortened)
                  
                  
                  Text(time.replacingOccurrences(of: ".", with: ":"))
                    .font(.system(
                      size:8.5
                    ))
                    .multilineTextAlignment(.trailing)
                    .frame(height: 10)
                    .foregroundColor(.secondary)
                     
                  if entry.lookAhead.last.self != lookAhead.self {
                    Spacer()
                  }
                }
              }
          }
            .containerBackground(for: .widget, content: {Color("AccentColor")})
          }
        }
        
    } else {
        Text(entry.date, style: .time)
    };
  }
}

@main
struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
        }
        .configurationDisplayName("Skemaoversigt")
        .description("Dan dig et overblik over dit skema")
    }
}

struct widget_Previews: PreviewProvider {
    static func calculateLookAhead() -> Array<Date> {
        var lookAhead: [Date] = []
        let entryDate = Date()
      
        for hourOffset in 0 ..< 5 {
        lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }

        return lookAhead
    }
  
    static var previews: some View {
        let start = Calendar.current.date(byAdding: .minute, value: -120, to: Date())!
        let end = Calendar.current.date(byAdding: .minute, value: 120, to: Date())!
      
        widgetEntryView(entry: SimpleEntry(date: Date(),
           lookAhead: calculateLookAhead(),
           modules: [Module(
            start: start,
            end: end,
            title: "test modul",
            status: Status.normal,
            overlaps: 2,
            _id: "unique id"
        )]))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
