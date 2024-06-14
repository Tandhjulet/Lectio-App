//
//  widget.swift
//  widget
//

import WidgetKit
import SwiftUI
import Intents

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        var lookAhead: [Date] = []
        let entryDate = Date()
      
        for hourOffset in 0 ..< 3 {
          lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }
            
        return SimpleEntry(date: Date(),
                    lookAhead: lookAhead,
                    modules: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
      
      let userDefaults = UserDefaults.init(suiteName: "group.widget");
      if(userDefaults != nil) {
          let entryDate = Date()
          if let savedData = userDefaults!.value(forKey: "skema") as? String {
              let decoder = JSONDecoder();
              let data = savedData.data(using: .utf8);
              if let parsedData = try? decoder.decode([String: [Module]].self, from: data!) {
                  
                  let currentDate = Calendar.current.component(.day, from: entryDate)
                  
                  var lookAhead: [Date] = []
                  for hourOffset in 0 ..< 3 {
                    lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
                  }
                  
                  let entry = SimpleEntry(date: entryDate,
                                        lookAhead: lookAhead,
                                          modules: parsedData[String(currentDate)] ?? [])
                      
                  completion(entry)
              }
          } else {
              var lookAhead: [Date] = []
              let entryDate = Date()
            
              for hourOffset in 0 ..< 3 {
                lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
              }
            
              let entry = SimpleEntry(date: entryDate,
                                    lookAhead: lookAhead,
                                    modules: [])
              completion(entry)
          }
      } else {
          let date = Calendar.current.date(byAdding: .hour, value: 5, to: Date())
          
          let entry = SimpleEntry(date: Date(),
                                lookAhead: [],
                                  modules: [], error: true)
          completion(entry)
      }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let userDefaults = UserDefaults.init(suiteName: "group.widget");
        if(userDefaults != nil) {
            let entryDate = Date()
            if let savedData = userDefaults!.value(forKey: "skema") as? String {
                let decoder = JSONDecoder();
                let data = savedData.data(using: .utf8);
                if let parsedData = try? decoder.decode([String: [Module]].self, from: data!) {
                    
                    let currentDate = Calendar.current.component(.day, from: entryDate)
                    let currentHour = Calendar.current.component(.hour, from: entryDate)
                    let requestAfter = Calendar.current.date(byAdding: .hour, value: currentHour > 7 && currentHour < 16 ? 1 : 3, to: entryDate)!
                    
                    var lookAhead: [Date] = []
                    for hourOffset in 0 ..< 3 {
                      lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
                    }
                    
                    let entry = SimpleEntry(date: entryDate,
                                          lookAhead: lookAhead,
                                            modules: parsedData[String(currentDate)] ?? [])
                        
                    let timeline = Timeline(entries: [entry], policy: .after(requestAfter))
                    completion(timeline)
                }
            } else {
                var lookAhead: [Date] = []
                let entryDate = Date()
              
                for hourOffset in 0 ..< 3 {
                  lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
                }
              
                let entry = SimpleEntry(date: entryDate,
                                      lookAhead: lookAhead,
                                      modules: [])
                let timeline = Timeline(entries: [entry], policy: .after(lookAhead.last!))
                completion(timeline)
            }
        } else {
            let date = Calendar.current.date(byAdding: .hour, value: 2, to: Date())
            
            let entry = SimpleEntry(date: Date(),
                                  lookAhead: [],
                                    modules: [], error: true)
            let timeline = Timeline(entries: [entry], policy: .after(date!))
            completion(timeline)
        }
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

enum Status: Decodable {
  case changed
  case cancelled
  case normal
}

struct Module: Decodable {
    let start: Date
    let end: Date
  
    let title: String
    let status: Status
  
    let _id: String
  
    let width: CGFloat
    let left: CGFloat
}

struct SimpleEntry: TimelineEntry {
    let date: Date
  
    let lookAhead: Array<Date>
    let modules: Array<Module>
    
    var error: Bool = false
}

struct widgetEntryView : View {
    var entry: Provider.Entry
  
    func calculateTop(module: Module, first: Date, geoHeight: CGFloat) -> CGFloat {
      let diff = module.start - first;
      var top = ((diff+(2))/(60*60*2)) * (geoHeight);
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
            if(!entry.error) {
              GeometryReader { geo in
                ZStack(alignment: .leading) {
                  ItemSeperator.frame(width: geo.size.width)
                  
                  ForEach(entry.modules, id: \._id) { module in
                    if(module.end > entry.lookAhead.first! && module.start < entry.lookAhead.last!) {
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
                              .fill(module.status == .normal ? Color("Primary") : module.status == .changed ? Color.yellow : Color("Red"))
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
                                width: .infinity, height: .infinity
                              )
                            
                            if(calculateHeight(start: module.start, end: module.end) * geo.size.height > 10+4*2) {
                              ZStack {
                                Text(module.title)
                                  .font(.system(size: 9, weight: .bold))
                                  .multilineTextAlignment(.leading)
                                  .foregroundStyle(Color.white)
                                  .minimumScaleFactor(0.6)
                              }.padding(4)
                            }
                          }
                          .frame(width: module.width * geo.size.width, height: calculateHeight(start: module.start, end: module.end) * geo.size.height)
                          
                          Spacer(minLength: 0)
                        }
                        
                        Spacer(minLength: 0)
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
            } else {
              
              Text("Der opstod en fejl").frame(
                maxWidth: .infinity,
                maxHeight: .infinity,
                alignment: .center
              ).multilineTextAlignment(.center)
              
            }
          }
        }.containerBackground(for: .widget, content: {Color("AccentColor")})
        
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
  let diff = (end - compareTo) / (60*60*2);
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
        let start = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
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
            
            width: 0.5,
            left: 0.0
        ), Module(
          start: start,
          end: end,
          title: "test modul",
          status: Status.changed,
          _id: "unique id 2",
          
          width: 0.5,
          left: 0.5
      ), Module(
        start: start2,
        end: end2,
        title: "test modul",
        status: Status.cancelled,
        _id: "unique id 3",
        
        width: 1,
        left: 0
      )]))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
