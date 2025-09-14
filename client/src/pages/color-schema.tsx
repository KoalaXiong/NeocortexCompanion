
import React from 'react';

const ColorCard = ({ name, hslValue, description }: { name: string; hslValue: string; description?: string }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div 
        className="w-full h-20 rounded-md mb-3 border border-gray-300"
        style={{ backgroundColor: `hsl(${hslValue})` }}
      ></div>
      <h3 className="font-semibold text-gray-800 text-sm">{name}</h3>
      <p className="text-xs text-gray-600 font-mono">hsl({hslValue})</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
};

const ColorSchemaPage = () => {
  const lightModeColors = [
    { name: 'Background', hsl: '0, 0%, 100%', desc: 'Main background' },
    { name: 'Foreground', hsl: '20, 14.3%, 4.1%', desc: 'Main text' },
    { name: 'Primary', hsl: '262, 83%, 58%', desc: 'Purple brand color' },
    { name: 'Primary Foreground', hsl: '0, 0%, 100%', desc: 'Text on primary' },
    { name: 'Secondary', hsl: '231, 81%, 60%', desc: 'Blue accent' },
    { name: 'Secondary Foreground', hsl: '0, 0%, 100%', desc: 'Text on secondary' },
    { name: 'Muted', hsl: '60, 4.8%, 95.9%', desc: 'Subtle background' },
    { name: 'Muted Foreground', hsl: '25, 5.3%, 44.7%', desc: 'Muted text' },
    { name: 'Accent', hsl: '60, 4.8%, 95.9%', desc: 'Accent background' },
    { name: 'Accent Foreground', hsl: '24, 9.8%, 10%', desc: 'Text on accent' },
    { name: 'Destructive', hsl: '0, 84.2%, 60.2%', desc: 'Error/danger red' },
    { name: 'Border', hsl: '20, 5.9%, 90%', desc: 'Border lines' },
    { name: 'Input', hsl: '20, 5.9%, 90%', desc: 'Input backgrounds' },
    { name: 'Ring', hsl: '20, 14.3%, 4.1%', desc: 'Focus rings' },
  ];

  const customAppColors = [
    { name: 'Primary 50', hsl: '262, 100%, 98%', desc: 'Lightest purple' },
    { name: 'Primary 100', hsl: '262, 91%, 95%', desc: 'Very light purple' },
    { name: 'Primary 200', hsl: '262, 87%, 87%', desc: 'Light purple' },
    { name: 'Primary 500', hsl: '262, 83%, 58%', desc: 'Main purple' },
    { name: 'Primary 600', hsl: '262, 83%, 48%', desc: 'Dark purple' },
    { name: 'Primary 700', hsl: '262, 83%, 38%', desc: 'Darker purple' },
    { name: 'Secondary 500', hsl: '231, 81%, 60%', desc: 'Main blue' },
    { name: 'Secondary 600', hsl: '231, 81%, 50%', desc: 'Dark blue' },
  ];

  const colorVariants = [
    { name: 'Purple 50', hsl: '270, 100%, 98%', desc: 'Purple tint' },
    { name: 'Purple 100', hsl: '269, 100%, 95%', desc: 'Purple light' },
    { name: 'Purple 200', hsl: '269, 100%, 92%', desc: 'Purple medium' },
    { name: 'Blue 50', hsl: '214, 100%, 97%', desc: 'Blue tint' },
    { name: 'Blue 100', hsl: '214, 95%, 93%', desc: 'Blue light' },
    { name: 'Blue 200', hsl: '213, 97%, 87%', desc: 'Blue medium' },
    { name: 'Green 100', hsl: '149, 80%, 90%', desc: 'Success light' },
    { name: 'Green 700', hsl: '150, 86%, 65%', desc: 'Success color' },
    { name: 'Orange 100', hsl: '24, 100%, 93%', desc: 'Warning light' },
    { name: 'Orange 700', hsl: '20, 90%, 48%', desc: 'Warning color' },
    { name: 'Red 100', hsl: '0, 93%, 94%', desc: 'Error light' },
    { name: 'Red 700', hsl: '0, 84%, 60%', desc: 'Error color' },
  ];

  const darkModeColors = [
    { name: 'Dark Background', hsl: '240, 10%, 3.9%', desc: 'Dark mode bg' },
    { name: 'Dark Foreground', hsl: '0, 0%, 98%', desc: 'Dark mode text' },
    { name: 'Dark Muted', hsl: '240, 3.7%, 15.9%', desc: 'Dark muted bg' },
    { name: 'Dark Muted Foreground', hsl: '240, 5%, 64.9%', desc: 'Dark muted text' },
    { name: 'Dark Border', hsl: '240, 3.7%, 15.9%', desc: 'Dark borders' },
    { name: 'Dark Accent', hsl: '240, 3.7%, 15.9%', desc: 'Dark accent' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Color Schema Reference</h1>
          <p className="text-gray-600">Visual reference for all HSL colors in the current design system</p>
        </div>

        {/* Light Mode Base Colors */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Light Mode Base Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {lightModeColors.map((color, index) => (
              <ColorCard 
                key={index} 
                name={color.name} 
                hslValue={color.hsl} 
                description={color.desc}
              />
            ))}
          </div>
        </section>

        {/* Custom App Colors */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Custom App Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {customAppColors.map((color, index) => (
              <ColorCard 
                key={index} 
                name={color.name} 
                hslValue={color.hsl} 
                description={color.desc}
              />
            ))}
          </div>
        </section>

        {/* Color Variants */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Color Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {colorVariants.map((color, index) => (
              <ColorCard 
                key={index} 
                name={color.name} 
                hslValue={color.hsl} 
                description={color.desc}
              />
            ))}
          </div>
        </section>

        {/* Dark Mode Colors */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Dark Mode Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {darkModeColors.map((color, index) => (
              <ColorCard 
                key={index} 
                name={color.name} 
                hslValue={color.hsl} 
                description={color.desc}
              />
            ))}
          </div>
        </section>

        {/* Gradient Examples */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Gradient Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="w-full h-20 rounded-md mb-3 gradient-primary"></div>
              <h3 className="font-semibold text-gray-800 text-sm">Primary Gradient</h3>
              <p className="text-xs text-gray-600">Purple to Blue (135deg)</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="w-full h-20 rounded-md mb-3 gradient-primary-to-secondary"></div>
              <h3 className="font-semibold text-gray-800 text-sm">Primary to Secondary</h3>
              <p className="text-xs text-gray-600">Purple to Blue (90deg)</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="w-full h-20 rounded-md mb-3 gradient-purple-blue"></div>
              <h3 className="font-semibold text-gray-800 text-sm">Purple Blue Light</h3>
              <p className="text-xs text-gray-600">Light gradient (135deg)</p>
            </div>
          </div>
        </section>

        {/* HSL Color Space Info */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">HSL Color Space Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Hue (0-360°)</h3>
              <p className="text-gray-600">0° = Red, 120° = Green, 240° = Blue</p>
              <p className="text-gray-600">Your primary purple is at 262°</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Saturation (0-100%)</h3>
              <p className="text-gray-600">0% = Gray, 100% = Pure color</p>
              <p className="text-gray-600">Your primary uses 83% saturation</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Lightness (0-100%)</h3>
              <p className="text-gray-600">0% = Black, 50% = Pure, 100% = White</p>
              <p className="text-gray-600">Your primary uses 58% lightness</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ColorSchemaPage;
