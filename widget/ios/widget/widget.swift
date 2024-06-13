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
  
  var _id: String
  
  var height: CGFloat
  var width: CGFloat
  var left: CGFloat
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
      var top = (diff/(60*60*3)) * geoHeight;
      top = top < 0 ? 0 : top;
      
      return top;
    }
  
    private var ItemSeperator: some View {
      VStack(alignment: .leading, spacing: 0) {
        ForEach(entry.lookAhead, id: \.self) { lookAhead in
          Color.clear
            .frame(
              maxWidth: 0,
              maxHeight: 0
            )
          
          Divider().frame(maxWidth: .infinity, maxHeight: 10)
             
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
          
          HStack(spacing: 5) {
            GeometryReader { geo in
              ZStack(alignment: .leading) {
                ItemSeperator.frame(width: geo.size.width)
                
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
                      
                      HStack(spacing: 0) {
                        Color.clear
                          .frame(width: module.left * geo.size.width, height: 0)
                        
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
                              width: module.width * geo.size.width, height: module.height * geo.size.height
                            )
                          
                          if(module.height * geo.size.height > 10+4*2) {
                            ZStack {
                              Text(module.title)
                                .font(.system(size: 9, weight: .bold))
                                .multilineTextAlignment(.leading)
                                .foregroundStyle(Color.white)
                            }.padding(4)
                          }
                        }
                        .frame(width: module.width * geo.size.width, height: module.height * geo.size.height)
                        
                        Spacer()
                      }
                      
                      Spacer()
                    }
                  }
                }
              }
              .frame(
                maxWidth: .infinity,
                maxHeight: .infinity
              )
            }
              
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

func calculateHeight(start: Date, end: Date) -> CGFloat {
  let compareTo: Date = start < Date() ? Date() : start;
  let diff = (end - compareTo) / (60*60*3);
  return diff;
}

struct widget_Previews: PreviewProvider {
    static func calculateLookAhead() -> Array<Date> {
        var lookAhead: [Date] = []
        let entryDate = Date()
      
        for hourOffset in 0 ..< 3 {
        lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }

        return lookAhead
    }
  
    static var previews: some View {
        let start = Calendar.current.date(byAdding: .minute, value: -5, to: Date())!
        let end = Calendar.current.date(byAdding: .minute, value: 60, to: Date())!
      
      let start2 = Calendar.current.date(byAdding: .minute, value: 60, to: Date())!
      let end2 = Calendar.current.date(byAdding: .minute, value: 120, to: Date())!
      
        widgetEntryView(entry: SimpleEntry(date: Date(),
           lookAhead: calculateLookAhead(),
           modules: [Module(
            start: start,
            end: end,
            title: "test modul",
            status: Status.normal,
            _id: "unique id",
            
            height: calculateHeight(start: start, end: end),
            width: 0.5,
            left: 0.0
        ), Module(
          start: start,
          end: end,
          title: "test modul",
          status: Status.normal,
          _id: "unique id 2",
          
          height: calculateHeight(start: start, end: end),
          width: 0.5,
          left: 0.5
      ), Module(
        start: start2,
        end: end2,
        title: "test modul",
        status: Status.normal,
        _id: "unique id 3",
        
        height: calculateHeight(start: start2, end: end2),
        width: 1,
        left: 0
    )]))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
