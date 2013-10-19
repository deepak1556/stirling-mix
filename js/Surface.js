var Visual = Visual || {};
Visual.Surface = new function()
{
	// internal vars
	var camera,
		scene,
		renderer		= null,
		canvas			= null,
		context			= null,
		$container 		= $('#room'),
		width			= $container.width(),
		height			= $container.height(),
		vars			= [],
		projector		= new THREE.Projector(),
		center			= new THREE.Vector3(),
		orbitCamera		= true,
		orbitValue		= 0,
		lastRainDrop	= 0,
		image			= null,
		running 		= true,
		
	// core objects
		surface			= null,
		surfaceVerts	= [],
		raindrops		= [],
		
	// constants
		DAMPEN			= .9,
		AGGRESSION		= 400,
		DEPTH 			= 100,
		NEAR 			= 1,
		FAR 			= 10000,
		X_RESOLUTION	= 30,
		Y_RESOLUTION	= 30,
		SURFACE_WIDTH	= 500,
		SURFACE_HEIGHT	= 400,
		DROP_RATE		= 1000,
		fin 			= true;
	
	/**
	 * Initializes the experiment and kicks
	 * everything off. Yay!
	 */
	this.init = function()
	{
		// stop the user clicking
		document.onselectstart		= function(){ return false; };
		
		// set up our initial vars
		vars["magnitude"]			= 100;
		vars["wireframeOpacity"]	= 1;
		vars["raindrops"]			= true;
		vars["elasticity"]			= 0.0005;
		
		// add listeners
		addEventListeners();
		
		// create our stuff
		if(createRenderer())
		{
			createObjects();
			addLights();
		
			// start rendering, which will
			// do nothing until the image is dropped
			update();
		
		}
	};

	/**
	 * Simple handler function for 
	 * the events we don't care about
	 */
	function cancel(event)
	{
		if(event.preventDefault)
			event.preventDefault();
		
		return false;
	}
	
	/**
	 * Adds some basic lighting to the
	 * scene. Only applies to the centres
	 */
	function addLights()
	{
		// point
		pointLight = new THREE.PointLight( 0xFFFFFF );
		pointLight.position.x = 10;
		pointLight.position.y = 100;
		pointLight.position.z = 10;
		scene.addLight( pointLight );
	}
	
	/**
	 * Creates the objects we need
	 */
	function createObjects()
	{
		var planeMaterial 		= new THREE.MeshLambertMaterial({color: 0xAFAFAF,shading: THREE.SmoothShading}),
			planeMaterialWire 	= new THREE.MeshLambertMaterial({color: 0xAFAFAF, wireframe:true});
		
		surface 				= new THREE.Mesh(new Plane(SURFACE_WIDTH, SURFACE_HEIGHT, X_RESOLUTION, Y_RESOLUTION), [planeMaterial, planeMaterialWire]);
		surface.rotation.x 		= -Math.PI * .5;
		surface.overdraw		= true;
		scene.addChild(surface);
		
		// go through each vertex
		surfaceVerts 	= surface.geometry.vertices;
		sCount			= surfaceVerts.length;
		
		// three.js creates the verts for the
		// mesh in x,y,z order I think
		while(sCount--)
		{
			var vertex 		= surfaceVerts[sCount];
			vertex.springs 	= [];
			vertex.velocity = new THREE.Vector3();
			
			// connect this vertex to the ones around it
			if(vertex.position.x > (-SURFACE_WIDTH * .5))
			{
				// connect to left
				vertex.springs.push({start:sCount, end:sCount-1});
			}
			
			if(vertex.position.x < (SURFACE_WIDTH * .5))
			{
				// connect to right
				vertex.springs.push({start:sCount, end:sCount+1});
			}
			
			if(vertex.position.y < (SURFACE_HEIGHT * .5))
			{
				// connect above
				vertex.springs.push({start:sCount, end:sCount-(X_RESOLUTION+1)});
			}

			if(vertex.position.y > (-SURFACE_HEIGHT * .5))
			{
				// connect below
				vertex.springs.push({start:sCount, end:sCount+(X_RESOLUTION+1)});
			}
		}
	}
	
	/**
	 * Creates the WebGL renderer
	 */
	function createRenderer()
	{
		var ok = false;
		
		try
		{
			renderer 					= new THREE.WebGLRenderer();
			camera 						= new THREE.Camera(45, width / height, NEAR, FAR);
			scene 						= new THREE.Scene();
			canvas						= document.createElement('canvas');
			canvas.width				= SURFACE_WIDTH;
			canvas.height				= SURFACE_HEIGHT;
			context						= canvas.getContext('2d');
			
			context.fillStyle = "#000000";
			context.beginPath();
			context.fillRect(0,0,SURFACE_WIDTH,SURFACE_HEIGHT);
			context.closePath();
			context.fill();
	
		
		    // position the camera
			camera.position.y 			= 220;
			camera.position.z			= DEPTH;
		    
		    // start the renderer
		    renderer.setSize(width, height);
		    $("#bottom").append(renderer.domElement);
		
		    ok = true;
		}
		catch(e)
		{
			ok = false;
		}
		
		return ok;
	}
	
	/**
	 * Sets up the event listeners for DnD, the GUI
	 * and window resize
	 */
	function addEventListeners()
	{
		// window event
		$(window).resize(callbacks.windowResize);
		$(window).keydown(callbacks.keyDown);
	}
	
	function updatePlane()
	{
		var ratio				= 1 / Math.max(image.width/SURFACE_WIDTH, image.height/SURFACE_HEIGHT);
		var scaledWidth			= image.width * ratio;
		var scaledHeight		= image.height * ratio;
		context.drawImage(image,
							0,0,image.width,image.height,
							(SURFACE_WIDTH - scaledWidth) * .5, (SURFACE_HEIGHT - scaledHeight) *.5, scaledWidth, scaledHeight);
	
		var newPlaneMaterial 	= new THREE.MeshLambertMaterial({color: 0xFFFFFF, shading: THREE.SmoothShading});
		surface.materials[0] 	= newPlaneMaterial;
	}
	
	/**
	 * Updates the velocity and position
	 * of the particles in the view
	 */
	function update()
	{
		camera.update();
		
		if(vars["raindrops"])
		{
			if(new Date().getTime() - lastRainDrop > DROP_RATE)
			{
				var raindropMaterial 	= new THREE.MeshBasicMaterial({color:0xFFFFFF, opacity: 0.7});
				var raindrop 			= new THREE.Mesh(new Sphere(2,2,8,8), raindropMaterial);
				raindrop.velocity 		= new THREE.Vector3(0,0,0);
				raindrop.position		= new THREE.Vector3(SURFACE_WIDTH * .5 - Math.random() * SURFACE_WIDTH,600,SURFACE_HEIGHT * .5 - Math.random() * SURFACE_HEIGHT);
				raindrops.push(raindrop);
				scene.addChild(raindrop);
				
				lastRainDrop = new Date().getTime();
			}
		}
		
		var r = raindrops.length;
		while(r--)
		{
			var raindrop = raindrops[r];
			raindrop.velocity.addSelf(new THREE.Vector3(0,-0.3,0));
			raindrop.position.addSelf(raindrop.velocity);
			
			if(raindrop.position.y < 0)
			{
				scene.removeChild(raindrop);
				raindrops.splice(r,1);
				
				var xVal	= Math.floor((raindrop.position.x / SURFACE_WIDTH) * X_RESOLUTION),
				yVal		= Math.floor((raindrop.position.z / SURFACE_HEIGHT) * Y_RESOLUTION);
			
				xVal 		+= X_RESOLUTION * .5;
				yVal 		+= Y_RESOLUTION * .5;
	
				index		= (yVal * (X_RESOLUTION + 1)) + xVal;
				
				surfaceVerts[index].velocity.z += vars["magnitude"] * 5;
			}
		}
		
		surface.materials[1].opacity = vars["wireframeOpacity"];
		
		var v = surfaceVerts.length;
		while(v--) {
			var vertex			= surfaceVerts[v],
				acceleration 	= new THREE.Vector3(0, 0, -vertex.position.z * vars["elasticity"]),
				springs			= vertex.springs,
				s				= springs.length;
			
			vertex.velocity.addSelf(acceleration);
			
			while(s--) {
				var spring 		= springs[s],
					extension	= surfaceVerts[spring.start].position.z - surfaceVerts[spring.end].position.z;
				
				acceleration 	= new THREE.Vector3(0, 0, extension * vars["elasticity"] * 50);
				surfaceVerts[spring.end].velocity.addSelf(acceleration);
				surfaceVerts[spring.start].velocity.subSelf(acceleration);
			}

			vertex.position.addSelf(vertex.velocity);
			
			vertex.velocity.multiplyScalar(DAMPEN);
		}
		
		surface.geometry.computeFaceNormals(true);
		surface.geometry.__dirtyVertices = true;
		surface.geometry.__dirtyNormals = true;
		
		// set up a request for a render
		requestAnimationFrame(render);
	}
	
	/**
	 * Renders the current state
	 */
	function render()
	{
		// only render
		if(renderer) {
			renderer.render(scene, camera);
		}
		
		// set up the next frame
		if(running) {
			update();
		}
	}

	/**
	 * Our internal callbacks object - a neat
	 * and tidy way to organise the various
	 * callbacks in operation.
	 */
	callbacks = {
		windowResize: function() {
			
			if(camera)
			{
				width			= $container.width(),
				height			= $container.height(),
				camera.aspect 	= width / height,
				renderer.setSize(width, height);
			
				camera.updateProjectionMatrix();
			}
		}
	};
};