module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n, send;
  reg [7:0] data;
  wire tx;
  uart_tx #(.BIT_TICKS(4)) dut(.clk(clk), .rst_n(rst_n), .send(send), .data(data), .tx(tx));
  initial begin
    rst_n = 0; send = 0; data = 8'h00;
    repeat (2) @(posedge clk);
    rst_n = 1;
    @(negedge clk); send = 1;
    @(negedge clk); send = 0;
    repeat (4) @(posedge clk);
    #1;
    if (tx !== 1'b0) begin
      $display("FAIL tx=%b expected start bit 0", tx);
      $finish;
    end
    repeat (4) @(posedge clk);
    #1;
    if (tx === 1'b0) $display("PASS first data bit");
    else $display("FAIL tx=%b expected data bit 0", tx);
    $finish;
  end
endmodule
